"use client";

import { useRef, useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  clipStartTime: number;
  trimStart: number;
  trimEnd: number;
  clipDuration: number;
  sampleTime?: number;
  silent?: boolean;
  visualFilter?: string;
  onVideoElement?: (video: HTMLVideoElement | null) => void;
  onMediaError?: () => void;
}

export function VideoPlayer({
  src,
  poster,
  className = "",
  clipStartTime,
  trimStart,
  trimEnd,
  clipDuration,
  sampleTime,
  silent = false,
  visualFilter,
  onVideoElement,
  onMediaError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isPlaying, currentTime, volume, speed, muted } = usePlaybackStore();

  useEffect(() => {
    onVideoElement?.(videoRef.current);
    return () => onVideoElement?.(null);
  }, [src, onVideoElement]);

  // Calculate if we're within this clip's timeline range
  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange =
    currentTime >= clipStartTime && currentTime < clipEndTime;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || sampleTime === undefined) return;
    const update = () => {
      if (Math.abs(video.currentTime - sampleTime) > 1 / 60)
        video.currentTime = Math.max(
          0,
          Math.min(sampleTime, Math.max(0, video.duration - 1 / 30))
        );
    };
    if (video.readyState >= 2) update();
    video.addEventListener("loadeddata", update);
    return () => video.removeEventListener("loadeddata", update);
  }, [sampleTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || sampleTime !== undefined || !isInClipRange) return;
    const sync = () => {
      const target = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd - 1 / 30,
          currentTime - clipStartTime + trimStart
        )
      );
      if (Math.abs(video.currentTime - target) > (isPlaying ? 0.15 : 1 / 60))
        video.currentTime = target;
    };
    if (video.readyState >= 2) sync();
    video.addEventListener("loadeddata", sync);
    return () => video.removeEventListener("loadeddata", sync);
  }, [
    currentTime,
    clipStartTime,
    trimStart,
    trimEnd,
    clipDuration,
    sampleTime,
    isPlaying,
    isInClipRange,
  ]);

  // Sync playback events
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInClipRange || sampleTime !== undefined) return;

    const handleSeekEvent = (e: CustomEvent) => {
      // Always update video time, even if outside clip range
      const timelineTime = e.detail.time;
      const videoTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );
      video.currentTime = videoTime;
    };

    const handleUpdateEvent = (e: CustomEvent) => {
      // Always update video time, even if outside clip range
      const timelineTime = e.detail.time;
      const targetTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );

      if (Math.abs(video.currentTime - targetTime) > 0.5) {
        video.currentTime = targetTime;
      }
    };

    const handleSpeed = (e: CustomEvent) => {
      video.playbackRate = e.detail.speed;
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
  }, [
    clipStartTime,
    trimStart,
    trimEnd,
    clipDuration,
    isInClipRange,
    sampleTime,
  ]);

  // Sync playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && isInClipRange && sampleTime === undefined) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, isInClipRange, sampleTime]);

  // Sync volume and speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = muted || silent;
    video.playbackRate = speed;
  }, [volume, speed, muted, silent]);

  return (
    <video
      ref={videoRef}
      onError={onMediaError}
      src={src}
      poster={poster}
      className={`max-w-full max-h-full object-contain ${className}`}
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      style={{ pointerEvents: "none", filter: visualFilter }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
