import {
  appearanceFilter,
  containRect,
  type ClipAppearance,
} from "./editor-model";
/** One pixel compositor for the native-player preview and the export encoder. */
export function drawMediaFrame(
  context: CanvasRenderingContext2D,
  media: HTMLVideoElement | HTMLImageElement,
  appearance: ClipAppearance,
  settings: { width: number; height: number; resolution: number }
) {
  const sw =
    media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
  const sh =
    media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
  if (!sw || !sh) return;
  const a = appearance;
  const box = containRect(settings.width, settings.height, sw, sh, a.fit);
  context.save();
  try {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.scale(settings.resolution, settings.resolution);
    context.translate(
      settings.width / 2 + (a.x ?? 0),
      settings.height / 2 + (a.y ?? 0)
    );
    context.rotate(((a.rotation ?? 0) * Math.PI) / 180);
    context.scale(a.scale ?? 1, a.scale ?? 1);
    context.globalAlpha = a.opacity ?? 1;
    context.filter = appearanceFilter(a);
    context.drawImage(
      media,
      box.x - settings.width / 2,
      box.y - settings.height / 2,
      box.width,
      box.height
    );
    context.filter = "none";
    if (a.vignette) {
      const gradient = context.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        Math.hypot(box.width, box.height) / 2
      );
      gradient.addColorStop(0.25, "transparent");
      gradient.addColorStop(1, `rgba(0,0,0,${a.vignette})`);
      context.fillStyle = gradient;
      context.fillRect(
        box.x - settings.width / 2,
        box.y - settings.height / 2,
        box.width,
        box.height
      );
    }
  } finally {
    context.restore();
  }
}
