import type { StickerShape } from "./editor-model";
/** The same normalized SVG paths are used by DOM previews and Canvas export. */
export const STICKER_PATHS: Record<StickerShape, string> = {
  rectangle: "M0 0H100V100H0Z",
  circle: "M50 0A50 50 0 1 1 49.99 0Z",
  triangle: "M50 0L100 100H0Z",
  star: "M50 0L61 35L98 35L68 57L79 93L50 71L21 93L32 57L2 35L39 35Z",
  heart: "M50 94C-25 47 0-15 50 20C100-15 125 47 50 94Z",
  arrow: "M0 35H60V10L100 50L60 90V65H0Z",
};
