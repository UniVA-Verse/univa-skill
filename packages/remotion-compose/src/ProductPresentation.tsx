import type React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { cameraAt, cropGeometry, sceneExitOpacity } from "./presentation-math";
import type { ProductPresentation, PresentationScreenScene } from "./types";

const FONT =
  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
type Scene = ProductPresentation["scenes"][number];

const RecordedScreen: React.FC<{
  scene: PresentationScreenScene;
  videoSrc: string;
  sourceDimensions: { width: number; height: number };
  muted: boolean;
  durationFrames: number;
}> = ({ scene, videoSrc, sourceDimensions, muted, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const windowed = scene.layout === "window";
  const hasText = Boolean(scene.headline || scene.eyebrow || scene.subheadline);
  const availableWidth = windowed ? width * 0.9 : width;
  const availableHeight = windowed ? height * (hasText ? 0.72 : 0.88) : height;
  const areaTop = windowed && hasText ? height * 0.23 : 0;
  const areaHeight = windowed && hasText ? height * 0.74 : height;
  const geometry = cropGeometry(
    sourceDimensions.width,
    sourceDimensions.height,
    scene.crop,
    availableWidth,
    availableHeight
  );
  const camera = cameraAt(
    scene.camera,
    frame / Math.max(1, durationFrames - 1)
  );
  const light = scene.color_scheme === "light";
  return (
    <div
      style={{
        position: "absolute",
        width: geometry.width,
        height: geometry.height,
        left: (width - geometry.width) / 2,
        top: areaTop + (areaHeight - geometry.height) / 2,
        overflow: "hidden",
        transform: `perspective(1200px) translate(${camera.translateX * width}px, ${camera.translateY * height}px) rotateX(${camera.rotateX}deg) rotateY(${camera.rotateY}deg)`,
        borderRadius: windowed ? width * 0.0125 : 0,
        boxShadow: windowed
          ? light
            ? "0 32px 90px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.08)"
            : "0 36px 110px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.13)"
          : undefined,
      }}
    >
      <AbsoluteFill
        style={{
          transform: `scale(${camera.scale})`,
          transformOrigin: `${camera.focusX * 100}% ${camera.focusY * 100}%`,
        }}
      >
        <OffthreadVideo
          src={staticFile(videoSrc)}
          trimBefore={Math.round(scene.source_start_seconds * fps)}
          playbackRate={scene.playback_rate}
          muted={muted}
          style={{
            position: "absolute",
            left: geometry.sourceLeft,
            top: geometry.sourceTop,
            width: geometry.sourceWidth,
            height: geometry.sourceHeight,
            maxWidth: "none",
          }}
        />
      </AbsoluteFill>
    </div>
  );
};

const PresentationScene: React.FC<{
  scene: Scene;
  videoSrc: string;
  sourceDimensions: { width: number; height: number };
  muted: boolean;
  durationFrames: number;
}> = ({ scene, videoSrc, sourceDimensions, muted, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const title = scene.kind === "title";
  const light = scene.color_scheme === "light";
  const unit = width / 1920;
  const entrance = Math.min(1, frame / Math.max(1, Math.round(fps * 0.5)));
  const textOpacity = entrance * entrance * (3 - 2 * entrance);
  const exit = sceneExitOpacity(
    frame,
    durationFrames,
    fps,
    scene.transition_out
  );
  return (
    <AbsoluteFill style={{ background: scene.background }}>
      <AbsoluteFill style={{ opacity: exit }}>
        {scene.kind === "screen" ? (
          <RecordedScreen
            scene={scene}
            videoSrc={videoSrc}
            sourceDimensions={sourceDimensions}
            muted={muted}
            durationFrames={durationFrames}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: title ? "8%" : "6%",
            right: title ? "8%" : "6%",
            top: title ? "50%" : "5.6%",
            transform: title
              ? `translateY(calc(-50% + ${(1 - textOpacity) * 20 * unit}px))`
              : `translateY(${(1 - textOpacity) * 14 * unit}px)`,
            textAlign: title ? "center" : "left",
            fontFamily: FONT,
            color: light ? "#111114" : "#f5f5f7",
            opacity: textOpacity,
            whiteSpace: "pre-line",
          }}
        >
          {scene.eyebrow ? (
            <div
              style={{
                fontSize: (title ? 25 : 19) * unit,
                fontWeight: 600,
                letterSpacing: "0.15em",
                marginBottom: (title ? 26 : 12) * unit,
                opacity: 0.56,
              }}
            >
              {scene.eyebrow}
            </div>
          ) : null}
          {scene.headline ? (
            <div
              style={{
                fontSize: (title ? 116 : 48) * unit,
                lineHeight: title ? 1.06 : 1.12,
                fontWeight: 650,
                letterSpacing: title ? "-0.055em" : "-0.035em",
              }}
            >
              {scene.headline}
            </div>
          ) : null}
          {scene.subheadline ? (
            <div
              style={{
                marginTop: (title ? 30 : 14) * unit,
                fontSize: (title ? 32 : 23) * unit,
                lineHeight: 1.35,
                fontWeight: 400,
                opacity: 0.58,
              }}
            >
              {scene.subheadline}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ProductPresentationLayer: React.FC<{
  presentation: ProductPresentation;
  videoSrc: string;
  sourceDimensions: { width: number; height: number };
}> = ({ presentation, videoSrc, sourceDimensions }) => {
  const { fps } = useVideoConfig();
  const durationFrames = Math.round(
    presentation.scenes[presentation.scenes.length - 1].end_seconds * fps
  );
  const audioFadeFrames = Math.min(
    durationFrames / 2,
    (presentation.soundtrack_fade_seconds ?? 0.8) * fps
  );
  return (
    <AbsoluteFill>
      {presentation.soundtrack_src ? (
        <Audio
          src={staticFile(presentation.soundtrack_src)}
          trimBefore={Math.round(
            (presentation.soundtrack_start_seconds ?? 0) * fps
          )}
          volume={(frame) => {
            const fade =
              audioFadeFrames > 0
                ? Math.min(
                    1,
                    frame / audioFadeFrames,
                    (durationFrames - 1 - frame) / audioFadeFrames
                  )
                : 1;
            return Math.max(0, fade) * (presentation.soundtrack_volume ?? 0.6);
          }}
        />
      ) : null}
      {presentation.scenes.map((scene) => {
        const start = Math.round(scene.start_seconds * fps);
        const end = Math.round(scene.end_seconds * fps);
        return (
          <Sequence key={scene.id} from={start} durationInFrames={end - start}>
            <PresentationScene
              scene={scene}
              videoSrc={videoSrc}
              sourceDimensions={sourceDimensions}
              muted={presentation.muted}
              durationFrames={end - start}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
