import {
  TimelineDataTransformer,
  VideoExporter,
  type EditorTrack,
  type OpenCutExportOptions,
} from "@opencut/video-export";
import type { MediaItem } from "@/stores/media-store";
export function exportPlan(
  tracks: EditorTrack[],
  media: MediaItem[],
  project: { id: string; name: string },
  canvas: { width: number; height: number; fps: number },
  options: OpenCutExportOptions
) {
  let issues: string[] = [];
  let settings:
    | ReturnType<typeof VideoExporter.generateExportSettings>
    | undefined;
  try {
    const timeline = TimelineDataTransformer.transform(tracks, media, canvas);
    issues = TimelineDataTransformer.validateTimelineData(timeline);
    settings = VideoExporter.generateExportSettings(timeline, options);
  } catch (error) {
    issues = [error instanceof Error ? error.message : "Invalid timeline"];
  }
  const plan = {
    schema_version: 1,
    tool: "browser_timeline_export",
    approval_required: true,
    project: { id: project.id, name: project.name },
    request: {
      tracks,
      sources: media.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        path: m.serverPath ?? null,
        size: m.file.size,
        last_modified: m.file.lastModified,
      })),
      settings,
    },
    assumptions: [
      "Source files are immutable File snapshots; metadata is recorded, full content hashes are not computed",
      "No paid provider calls are involved",
    ],
    preservation: ["Source media and saved projects are not overwritten"],
    output_policy:
      "A new MP4 selected by the user; source files remain unchanged",
    quality_checks: [
      "Every visual source must decode",
      "Audio is retained unless explicitly muted",
      "No failed frame may be replaced by a silent fallback",
    ],
  };
  return {
    plan,
    validation: { status: issues.length ? "fail" : "pass", issues },
    serialized: JSON.stringify(plan),
  };
}
export async function exportPlanVersion(serialized: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized)
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}
