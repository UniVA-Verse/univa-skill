import type { PresentationCamera, PresentationCrop } from "./types";

/** Quantized fades remain defined even when 0.2 seconds is <= one frame. */
export const sceneExitOpacity = (
  frame: number,
  durationFrames: number,
  fps: number,
  transition: "cut" | "fade"
) => {
  if (transition === "cut" || durationFrames <= 1) return 1;
  const lastFrame = durationFrames - 1;
  const fadeFrames = Math.min(Math.round(fps * 0.2), durationFrames / 3);
  if (fadeFrames <= 1) return frame < lastFrame ? 1 : 0;
  return Math.max(0, Math.min(1, (lastFrame - frame) / (fadeFrames - 1)));
};

export const sourceTimeAt = (
  sourceStartSeconds: number,
  localFrame: number,
  fps: number,
  playbackRate: number
) => sourceStartSeconds + (localFrame / fps) * playbackRate;

export const cameraAt = (camera: PresentationCamera, progress: number) => {
  const p = Math.min(1, Math.max(0, progress));
  const eased = p * p * (3 - 2 * p);
  const mix = (a: number, b: number) => a + (b - a) * eased;
  return {
    scale: mix(camera.scale_from, camera.scale_to),
    focusX: mix(camera.focus_x_from, camera.focus_x_to),
    focusY: mix(camera.focus_y_from, camera.focus_y_to),
    rotateX: mix(camera.rotate_x_from, camera.rotate_x_to),
    rotateY: mix(camera.rotate_y_from, camera.rotate_y_to),
    translateX: mix(camera.translate_x_from, camera.translate_x_to),
    translateY: mix(camera.translate_y_from, camera.translate_y_to),
  };
};

/** Contain the cropped pixels, without distorting the recorded application. */
export const cropGeometry = (
  sourceWidth: number,
  sourceHeight: number,
  crop: PresentationCrop,
  availableWidth: number,
  availableHeight: number
) => {
  const aspect = (sourceWidth * crop.width) / (sourceHeight * crop.height);
  const width = Math.min(availableWidth, availableHeight * aspect);
  const height = width / aspect;
  return {
    width,
    height,
    sourceWidth: width / crop.width,
    sourceHeight: height / crop.height,
    sourceLeft: (-crop.x * width) / crop.width,
    sourceTop: (-crop.y * height) / crop.height,
  };
};
