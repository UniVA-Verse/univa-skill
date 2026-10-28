import { isClipAudioEnabled } from "../editor-model";
import type { ExportSettings, TimelineExportData } from "../types";
import {
  Input,
  BlobSource,
  ALL_FORMATS,
  Output,
  EncodedAudioPacketSource,
  EncodedPacket,
} from "mediabunny";
import { debugLogger } from "../utils/debug-logger";
import { bufferToF32Planar } from "../utils/audio-utils";

export class AudioProcessor {
  private settings: ExportSettings;

  constructor(settings: ExportSettings) {
    this.settings = settings;
  }

  async processAudio(
    timelineData: TimelineExportData,
    output: Output,
    audioSource: EncodedAudioPacketSource,
    audioConfig: AudioEncoderConfig
  ): Promise<void> {
    // Get audio tracks
    const audioTracks = timelineData.tracks.filter(
      (track) =>
        track.type === "audio" ||
        track.elements.some(
          (el) =>
            el.type === "media" &&
            ((el as any).mediaType === "audio" ||
              (el as any).mediaType === "video")
        )
    );

    if (audioTracks.length === 0) {
      return;
    }

    // Create audio buffer for the entire timeline
    const duration = timelineData.duration;
    const sampleRate = this.settings.sampleRate;
    const numberOfChannels = this.settings.numberOfChannels;
    const length = Math.ceil(duration * sampleRate);

    const audioBuffer = new AudioBuffer({
      numberOfChannels,
      length,
      sampleRate,
    });

    // Mix all audio tracks
    for (const track of audioTracks) {
      if (track.muted) continue;

      for (const element of track.elements) {
        if (
          element.type === "media" &&
          isClipAudioEnabled(element, track.muted) &&
          ((element as any).mediaType === "audio" ||
            (element as any).mediaType === "video")
        ) {
          await this.mixAudioElement(audioBuffer, element as any);
        }
      }
    }

    // Encode audio buffer
    await this.encodeAudioBuffer(audioBuffer, output, audioSource, audioConfig);
  }

  private async mixAudioElement(
    outputBuffer: AudioBuffer,
    element: any
  ): Promise<void> {
    try {
      debugLogger.log(`🔊 Mixing audio element: ${element.name}`);

      // Load audio file
      const audioContext = new OfflineAudioContext(
        outputBuffer.numberOfChannels,
        outputBuffer.length,
        outputBuffer.sampleRate
      );

      let arrayBuffer: ArrayBuffer;
      if (element.file) {
        arrayBuffer = await element.file.arrayBuffer();
      } else if (element.url) {
        const response = await fetch(element.url);
        if (!response.ok)
          throw new Error(`Audio fetch failed: ${response.status}`);
        arrayBuffer = await response.arrayBuffer();
      } else {
        throw new Error(`Missing audio source: ${element.name}`);
      }

      // A video without an audio track is valid, whereas a broken audio track is an error.
      const input = new Input({
        source: new BlobSource(new Blob([arrayBuffer])),
        formats: ALL_FORMATS,
      });
      if (!(await input.getPrimaryAudioTrack())) return;
      const sourceBuffer = await audioContext.decodeAudioData(arrayBuffer);
      debugLogger.log(
        `🔊 Source audio: ${sourceBuffer.sampleRate}Hz, ${sourceBuffer.numberOfChannels} channels, ${sourceBuffer.duration}s`
      );
      debugLogger.log(
        `🔊 Target audio: ${outputBuffer.sampleRate}Hz, ${outputBuffer.numberOfChannels} channels`
      );

      // Handle sample rate conversion if needed
      let processedBuffer = sourceBuffer;
      if (sourceBuffer.sampleRate !== outputBuffer.sampleRate) {
        debugLogger.log(
          `🔄 Resampling from ${sourceBuffer.sampleRate}Hz to ${outputBuffer.sampleRate}Hz`
        );

        // Create a resampling context
        const resamplingContext = new OfflineAudioContext(
          sourceBuffer.numberOfChannels,
          Math.ceil(sourceBuffer.duration * outputBuffer.sampleRate),
          outputBuffer.sampleRate
        );

        const bufferSource = resamplingContext.createBufferSource();
        bufferSource.buffer = sourceBuffer;
        bufferSource.connect(resamplingContext.destination);
        bufferSource.start(0);

        processedBuffer = await resamplingContext.startRendering();
        debugLogger.log(
          `✅ Resampling completed: ${processedBuffer.length} samples`
        );
      }

      // Calculate timing in samples
      const startSample = Math.floor(
        element.startTime * outputBuffer.sampleRate
      );
      const trimStartSamples = Math.floor(
        element.trimStart * outputBuffer.sampleRate
      );
      const trimEndSamples = Math.floor(
        element.trimEnd * outputBuffer.sampleRate
      );
      const sourceDuration = Math.min(
        processedBuffer.length - trimStartSamples - trimEndSamples,
        Math.round(
          (element.duration - element.trimStart - element.trimEnd) *
            outputBuffer.sampleRate
        )
      );

      debugLogger.log(
        `🔊 Mixing: startSample=${startSample}, trimStart=${trimStartSamples}, trimEnd=${trimEndSamples}, duration=${sourceDuration}`
      );

      // Mix into output buffer
      let samplesWritten = 0;
      for (
        let channel = 0;
        channel <
        Math.min(
          outputBuffer.numberOfChannels,
          processedBuffer.numberOfChannels
        );
        channel++
      ) {
        const outputData = outputBuffer.getChannelData(channel);
        const sourceData = processedBuffer.getChannelData(channel);

        for (
          let i = 0;
          i < sourceDuration && startSample + i < outputData.length;
          i++
        ) {
          const sourceIndex = trimStartSamples + i;
          if (sourceIndex < sourceData.length && sourceIndex >= 0) {
            outputData[startSample + i] +=
              sourceData[sourceIndex] * (element.volume ?? 1);

            // Clamp to prevent clipping
            if (outputData[startSample + i] > 1)
              outputData[startSample + i] = 1;
            if (outputData[startSample + i] < -1)
              outputData[startSample + i] = -1;

            if (channel === 0) samplesWritten++;
          }
        }
      }

      debugLogger.log(
        `✅ Mixed ${samplesWritten} samples for element: ${element.name}`
      );
    } catch (error) {
      throw new Error(
        `Failed to mix audio for ${element.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async encodeAudioBuffer(
    audioBuffer: AudioBuffer,
    output: Output,
    audioSource: EncodedAudioPacketSource,
    audioConfig: AudioEncoderConfig
  ): Promise<void> {
    const packets: Promise<unknown>[] = [];
    let encoderError: Error | undefined;
    const encoder = new AudioEncoder({
      output: (chunk, meta) => {
        const packet = EncodedPacket.fromEncodedChunk(chunk);
        const remaining = audioBuffer.duration - packet.timestamp;
        if (remaining <= 0) return;
        packets.push(
          audioSource
            .add(
              packet.clone({ duration: Math.min(packet.duration, remaining) }),
              meta
            )
            .catch((error) => {
              encoderError = error;
            })
        );
      },
      error: (error) => {
        encoderError = error;
      },
    });

    encoder.configure(audioConfig);

    try {
      debugLogger.log(
        `🔊 Encoding audio buffer: ${audioBuffer.length} samples, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels`
      );

      // Encode entire buffer at once
      const audioData = new AudioData({
        format: "f32-planar",
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        numberOfFrames: audioBuffer.length,
        timestamp: 0,
        data: bufferToF32Planar(audioBuffer),
      });

      encoder.encode(audioData);
      audioData.close();

      await encoder.flush();
      await Promise.all(packets);
      if (encoderError) throw encoderError;
      encoder.close();
      debugLogger.log("✅ Audio encoding completed successfully");
    } catch (error) {
      encoder.close();
      debugLogger.error("❌ Audio encoding failed:", error);
      throw error;
    }
  }
}
