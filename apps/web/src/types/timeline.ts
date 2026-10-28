import { MediaType } from "@/stores/media-store";
import { generateUUID } from "@/lib/utils";

export type {
  EditorMediaElement as MediaElement,
  EditorTextElement as TextElement,
} from "@opencut/video-export";
import type {
  EditorTrackType,
  EditorElement,
  CreateEditorElement,
  EditorTrack,
} from "@opencut/video-export";
export type TrackType = EditorTrackType;
export type TimelineElement = EditorElement;
export type CreateTimelineElement = CreateEditorElement;
export type CreateMediaElement = Omit<
  import("@opencut/video-export").EditorMediaElement,
  "id"
>;
export type CreateTextElement = Omit<
  import("@opencut/video-export").EditorTextElement,
  "id"
>;

export interface TimelineElementProps {
  element: TimelineElement;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onElementMouseDown: (e: React.MouseEvent, element: TimelineElement) => void;
  onElementClick: (e: React.MouseEvent, element: TimelineElement) => void;
}

export interface ResizeState {
  elementId: string;
  side: "left" | "right";
  startX: number;
  initialTrimStart: number;
  initialTrimEnd: number;
}

// Drag data types for type-safe drag and drop
export interface MediaItemDragData {
  id: string;
  type: MediaType;
  name: string;
}

export interface TextItemDragData {
  id: string;
  type: "text";
  name: string;
  content: string;
}

export type DragData = MediaItemDragData | TextItemDragData;

export type TimelineTrack = EditorTrack;

export function sortTracksByOrder(tracks: TimelineTrack[]): TimelineTrack[] {
  return [...tracks].sort((a, b) => {
    // Text tracks always go to the top
    if (["text", "overlay", "subtitle"].includes(a.type) && b.type !== "text")
      return -1;
    if (["text", "overlay", "subtitle"].includes(b.type) && a.type !== "text")
      return 1;

    // Audio tracks always go to bottom
    if (a.type === "audio" && b.type !== "audio") return 1;
    if (b.type === "audio" && a.type !== "audio") return -1;

    // Main track goes above audio but below text tracks
    if (a.isMain && !b.isMain && b.type !== "audio" && b.type !== "text")
      return 1;
    if (b.isMain && !a.isMain && a.type !== "audio" && a.type !== "text")
      return -1;

    // Within same category, maintain creation order
    return 0;
  });
}

export function getMainTrack(tracks: TimelineTrack[]): TimelineTrack | null {
  return tracks.find((track) => track.isMain) || null;
}

export function ensureMainTrack(tracks: TimelineTrack[]): TimelineTrack[] {
  const hasMainTrack = tracks.some((track) => track.isMain);

  if (!hasMainTrack) {
    // Create main track if it doesn't exist
    const mainTrack: TimelineTrack = {
      id: generateUUID(),
      name: "Main Track",
      type: "media",
      elements: [],
      muted: false,
      isMain: true,
    };
    return [mainTrack, ...tracks];
  }

  return tracks;
}

// Timeline validation utilities
export function canElementGoOnTrack(
  elementType: "text" | "media",
  trackType: TrackType
): boolean {
  if (elementType === "text") {
    return ["text", "overlay", "subtitle"].includes(trackType);
  }
  if (elementType === "media") {
    return trackType === "media" || trackType === "audio";
  }
  return false;
}

export function validateElementTrackCompatibility(
  element: { type: "text" | "media" },
  track: { type: TrackType }
): { isValid: boolean; errorMessage?: string } {
  const isValid = canElementGoOnTrack(element.type, track.type);

  if (!isValid) {
    const errorMessage =
      element.type === "text"
        ? "Text elements can only be placed on text tracks"
        : "Media elements can only be placed on media or audio tracks";

    return { isValid: false, errorMessage };
  }

  return { isValid: true };
}
