import { BaseElementRenderer } from "./base-renderer";
import type { TextExportElement } from "../../types";
import { STICKER_PATHS } from "../../stickers";
export class TextElementRenderer extends BaseElementRenderer<TextExportElement> {
  private images = new Map<string, HTMLImageElement>();
  private urls = new Set<string>();
  async render(element: TextExportElement): Promise<void> {
    this.applyElementProperties(element);
    try {
      this.context.translate(
        this.settings.width / 2 + element.x,
        this.settings.height / 2 + element.y
      );
      this.context.rotate((element.rotation * Math.PI) / 180);
      if (element.sticker) {
        const { width, height, shape } = element.sticker;
        if (shape === "image") {
          let image = this.images.get(element.id);
          if (!image) {
            const source = element.stickerMedia;
            if (!source)
              throw new Error(`Missing sticker image: ${element.name}`);
            let url = source.url;
            if (!url && source.file) {
              url = URL.createObjectURL(source.file);
              this.urls.add(url);
            }
            if (!url)
              throw new Error(`Missing sticker source: ${element.name}`);
            image = new Image();
            image.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
              image!.onload = () => resolve();
              image!.onerror = () =>
                reject(new Error(`Cannot decode sticker: ${element.name}`));
              image!.src = url!;
            });
            this.images.set(element.id, image);
          }
          this.context.drawImage(image, -width / 2, -height / 2, width, height);
        } else {
          this.context.translate(-width / 2, -height / 2);
          this.context.scale(width / 100, height / 100);
          this.context.fillStyle = element.color;
          this.context.fill(new Path2D(STICKER_PATHS[shape]));
        }
        return;
      }
      await document.fonts.ready;
      this.context.font = `${element.fontStyle} ${element.fontWeight} ${element.fontSize}px "${element.fontFamily}", sans-serif`;
      this.context.textAlign = element.textAlign;
      this.context.textBaseline = "middle";
      const lines = element.content.split("\n");
      const lineHeight = element.fontSize * 1.2;
      const width = Math.max(
        ...lines.map((line) => this.context.measureText(line).width)
      );
      const x =
        element.textAlign === "left"
          ? -width / 2
          : element.textAlign === "right"
            ? width / 2
            : 0;
      if (element.backgroundColor !== "transparent") {
        this.context.fillStyle = element.backgroundColor;
        this.context.fillRect(
          -width / 2 - 8,
          (-lines.length * lineHeight) / 2 - 4,
          width + 16,
          lines.length * lineHeight + 8
        );
      }
      this.context.fillStyle = element.color;
      lines.forEach((line, n) => {
        const y = (n - (lines.length - 1) / 2) * lineHeight;
        this.context.fillText(line, x, y);
        if (element.textDecoration !== "none") {
          const w = this.context.measureText(line).width;
          const start =
            element.textAlign === "left"
              ? x
              : element.textAlign === "right"
                ? x - w
                : -w / 2;
          this.context.fillRect(
            start,
            y +
              (element.textDecoration === "underline"
                ? element.fontSize * 0.45
                : 0),
            w,
            Math.max(1, element.fontSize / 20)
          );
        }
      });
    } finally {
      this.restoreContext();
    }
  }
  dispose() {
    this.images.clear();
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls.clear();
  }
}
