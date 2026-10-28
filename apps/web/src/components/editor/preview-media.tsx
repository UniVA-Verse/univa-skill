"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  drawMediaFrame,
  sourceTime,
  type EditorMediaElement,
} from "@opencut/video-export";
import type { MediaItem } from "@/stores/media-store";
import { VideoPlayer } from "@/components/ui/video-player";
export function PreviewMedia({
  element,
  item,
  sampleTime,
  currentTime,
  canvasSize,
}: {
  element: EditorMediaElement;
  item: MediaItem;
  sampleTime: number;
  currentTime: number;
  canvasSize: { width: number; height: number };
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const source = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const [error, setError] = useState(false);
  const attach = useCallback((video: HTMLVideoElement | null) => {
    source.current = video;
  }, []);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const context = node.getContext("2d")!;
    const resize = () => {
      const rect = node.getBoundingClientRect();
      const w = Math.max(2, Math.round(rect.width * devicePixelRatio)),
        h = Math.max(2, Math.round(rect.height * devicePixelRatio));
      if (node.width !== w || node.height !== h) {
        node.width = w;
        node.height = h;
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    let frame = 0,
      stopped = false;
    const draw = () => {
      if (stopped) return;
      const media = source.current;
      if (
        media &&
        (media instanceof HTMLVideoElement
          ? media.readyState >= 2
          : media.complete)
      ) {
        try {
          // Seeking temporarily drops readyState below HAVE_CURRENT_DATA. Keep
          // the last decoded frame visible until its replacement is drawable.
          context.clearRect(0, 0, node.width, node.height);
          drawMediaFrame(context, media, element.appearance ?? {}, {
            ...canvasSize,
            resolution: node.width / canvasSize.width,
          });
        } catch {
          setError(true);
          stopped = true;
          return;
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [element.appearance, canvasSize.width, canvasSize.height, item.url]);
  return (
    <div className="absolute inset-0">
      {item.type === "video" ? (
        <VideoPlayer
          src={item.url!}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          clipStartTime={element.startTime}
          trimStart={element.trimStart}
          trimEnd={element.trimEnd}
          clipDuration={element.duration}
          sampleTime={
            element.freezeTime !== undefined || sampleTime !== currentTime
              ? sourceTime(element, sampleTime)
              : undefined
          }
          silent
          onVideoElement={attach}
          onMediaError={() => setError(true)}
        />
      ) : (
        <img
          ref={(image) => {
            source.current = image;
          }}
          src={item.url}
          alt={item.name}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          onError={() => setError(true)}
        />
      )}
      <canvas
        ref={canvas}
        className="absolute inset-0 w-full h-full"
        aria-label={item.name}
      />
      {error && (
        <p role="alert" className="absolute inset-0 p-4">
          Cannot decode or render {item.name}
        </p>
      )}
    </div>
  );
}
