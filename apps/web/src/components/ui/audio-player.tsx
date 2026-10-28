"use client";

import { useRef, useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

interface AudioPlayerProps {
  src: string;
  className?: string;
  clipStartTime: number;
  trimStart: number;
  trimEnd: number;
  clipDuration: number;
  trackMuted?: boolean;
  clipVolume?: number;
}

export function AudioPlayer({
  src,
  className = "",
  clipStartTime,
  trimStart,
  trimEnd,
  clipDuration,
  trackMuted = false,
  clipVolume = 1,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { isPlaying, currentTime, volume, speed, muted } = usePlaybackStore();

  // Calculate if we're within this clip's timeline range
  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange =
    currentTime >= clipStartTime && currentTime < clipEndTime;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isInClipRange) return;
    const sync = () => {
      const target = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          currentTime - clipStartTime + trimStart
        )
      );
      if (Math.abs(audio.currentTime - target) > (isPlaying ? 0.15 : 1 / 30))
        audio.currentTime = target;
    };
    if (audio.readyState >= 1) sync();
    audio.addEventListener("loadedmetadata", sync);
    return () => audio.removeEventListener("loadedmetadata", sync);
  }, [
    currentTime,
    clipStartTime,
    trimStart,
    trimEnd,
    clipDuration,
    isPlaying,
    isInClipRange,
  ]);

  // Sync playback events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isInClipRange) return;

    const handleSeekEvent = (e: CustomEvent) => {
      // Always update audio time, even if outside clip range
      const timelineTime = e.detail.time;
      const audioTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );
      audio.currentTime = audioTime;
    };

    const handleUpdateEvent = (e: CustomEvent) => {
      // Always update audio time, even if outside clip range
      const timelineTime = e.detail.time;
      const targetTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );

      if (Math.abs(audio.currentTime - targetTime) > 0.5) {
        audio.currentTime = targetTime;
      }
    };

    const handleSpeed = (e: CustomEvent) => {
      audio.playbackRate = e.detail.speed;
    };

    window.addEventListener("playback-seek", handleSeekEvent as EventListener);
    window.addEventListener(
      "playback-update",
      handleUpdateEvent as EventListener
    );
    window.addEventListener("playback-speed", handleSpeed as EventListener);

    return () => {
      window.removeEventListener(
        "playback-seek",
        handleSeekEvent as EventListener
      );
      window.removeEventListener(
        "playback-update",
        handleUpdateEvent as EventListener
      );
      window.removeEventListener(
        "playback-speed",
        handleSpeed as EventListener
      );
    };
  }, [clipStartTime, trimStart, trimEnd, clipDuration, isInClipRange]);

  // Sync playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && isInClipRange && !trackMuted) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, isInClipRange, trackMuted]);

  // Sync volume and speed
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = Math.max(0, Math.min(1, volume * clipVolume));
    audio.muted = muted || trackMuted;
    audio.playbackRate = speed;
  }, [volume, speed, muted, trackMuted, clipVolume]);

  return (
    <audio
      ref={audioRef}
      src={src}
      className={className}
      preload="auto"
      controls={false}
      style={{ display: "none" }} // Audio elements don't need visual representation
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
