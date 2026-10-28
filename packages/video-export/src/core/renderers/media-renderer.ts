import { BaseElementRenderer } from "./base-renderer";
import type { MediaExportElement } from "../../types";
import { sourceTime } from "../../editor-model";

import { drawMediaFrame } from "../../media-frame";

export class MediaElementRenderer extends BaseElementRenderer<MediaExportElement> {
  private mediaCache = new Map<string, HTMLVideoElement | HTMLImageElement>();
  private objectUrls = new Set<string>();
  async render(element: MediaExportElement, timestamp: number): Promise<void> {
    if (element.mediaType === "audio") return;
    const media = await this.loadMedia(element);
    if (media instanceof HTMLVideoElement)
      await this.seekVideo(
        media,
        sourceTime(element, timestamp, this.settings.fps)
      );
    drawMediaFrame(
      this.context,
      media,
      element.appearance ?? {},
      this.settings
    );
  }

  private async seekVideo(
    video: HTMLVideoElement,
    time: number,
    force = false
  ): Promise<void> {
    const target = Math.min(
      time,
      Math.max(0, video.duration - 1 / this.settings.fps)
    );
    if (
      !force &&
      Math.abs(video.currentTime - target) < 1 / (this.settings.fps * 2) &&
      video.readyState >= 2
    )
      return;
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        video.removeEventListener("seeked", ready);
        video.removeEventListener("error", failed);
        error ? reject(error) : resolve();
      };
      const ready = () => finish();
      const failed = () => finish(new Error("Video seek failed"));
      const timer = setTimeout(
        () => finish(new Error("Video seek timeout")),
        10_000
      );
      video.addEventListener("seeked", ready, { once: true });
      video.addEventListener("error", failed, { once: true });
      video.currentTime = target;
    });
  }
  private async loadMedia(
    element: MediaExportElement
  ): Promise<HTMLVideoElement | HTMLImageElement> {
    const cached = this.mediaCache.get(element.mediaId);
    if (cached) return cached;
    if (!element.file && !element.url)
      throw new Error(`Missing source for ${element.name}`);
    let src = element.url;
    if (!src) {
      src = URL.createObjectURL(element.file!);
      this.objectUrls.add(src);
    }
    const media =
      element.mediaType === "video"
        ? document.createElement("video")
        : new Image();
    media.crossOrigin = "anonymous";
    if (media instanceof HTMLVideoElement) {
      media.muted = true;
      media.preload = "auto";
      media.playsInline = true;
    }
    await new Promise<void>((resolve, reject) => {
      const event = media instanceof HTMLVideoElement ? "loadeddata" : "load";
      const finish = (error?: Error) => {
        clearTimeout(timer);
        media.removeEventListener(event, ready);
        media.removeEventListener("error", failed);
        error ? reject(error) : resolve();
      };
      const ready = () => finish();
      const failed = () => finish(new Error(`Cannot decode ${element.name}`));
      const timer = setTimeout(
        () => finish(new Error(`Loading ${element.name} timed out`)),
        15_000
      );
      media.addEventListener(event, ready, { once: true });
      media.addEventListener("error", failed, { once: true });
      media.src = src!;
      if (media instanceof HTMLVideoElement) media.load();
    });
    if (media instanceof HTMLVideoElement)
      await this.seekVideo(media, Math.min(0.001, media.duration / 2), true);
    this.mediaCache.set(element.mediaId, media);
    return media;
  }
  dispose(): void {
    for (const media of this.mediaCache.values())
      if (media instanceof HTMLVideoElement) {
        media.pause();
        media.removeAttribute("src");
        media.load();
      }
    this.mediaCache.clear();
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.clear();
  }
}
