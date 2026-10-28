import type { TimelineExportData, ExportTrack, ExportElement } from "../types";
import {
  normalizeTimeline,
  visibleDuration,
  type EditorTrack,
} from "../editor-model";
export interface EditorMediaItem {
  id: string;
  name: string;
  type: "video" | "image" | "audio";
  file?: File;
  url?: string;
  width?: number;
  height?: number;
  duration?: number;
}
// biome-ignore lint/complexity/noStaticOnlyClass: Preserve the public transformer API used by editor integrations.
export class TimelineDataTransformer {
  static transform(
    tracks: EditorTrack[],
    mediaItems: EditorMediaItem[],
    settings: { width: number; height: number; fps: number }
  ): TimelineExportData {
    const exportTracks: ExportTrack[] = normalizeTimeline(tracks).map(
      (track) => ({
        ...track,
        muted: !!track.muted,
        elements: track.elements.map((element): ExportElement => {
          if (element.type === "media") {
            const media = mediaItems.find((m) => m.id === element.mediaId);
            if (!media) throw new Error(`Missing media for ${element.name}`);
            return {
              ...element,
              mediaType: media.type,
              file: media.file,
              url: media.url,
              width: media.width,
              height: media.height,
            };
          }
          if (element.type !== "text")
            throw new Error("Unsupported timeline element");
          const stickerMedia =
            element.sticker?.shape === "image"
              ? mediaItems.find((m) => m.id === element.sticker?.mediaId)
              : undefined;
          if (element.sticker?.shape === "image" && !stickerMedia)
            throw new Error(`Missing image sticker: ${element.name}`);
          return { ...element, stickerMedia };
        }),
      })
    );
    const duration = Math.max(
      0,
      ...exportTracks.flatMap((t) =>
        t.elements.map((e) => e.startTime + visibleDuration(e))
      )
    );
    return { tracks: exportTracks, duration, settings };
  }
  static validateTimelineData(data: TimelineExportData): string[] {
    const errors: string[] = [];
    if (!data.tracks?.length || !data.tracks.some((t) => t.elements.length))
      errors.push("Add media or text before exporting");
    if (!Number.isFinite(data.duration) || data.duration <= 0)
      errors.push("Timeline duration must be positive");
    if (
      ![data.settings.width, data.settings.height, data.settings.fps].every(
        (n) => Number.isFinite(n) && n > 0
      )
    )
      errors.push("Invalid project settings");
    for (const track of data.tracks)
      for (const element of track.elements) {
        if (
          ![
            element.startTime,
            element.duration,
            element.trimStart,
            element.trimEnd,
          ].every(Number.isFinite) ||
          element.startTime < 0 ||
          visibleDuration(element) <= 0
        )
          errors.push(`Invalid timing: ${element.name}`);
        if (element.type === "media" && !element.file && !element.url)
          errors.push(`Missing source: ${element.name}`);
      }
    return errors;
  }
}
