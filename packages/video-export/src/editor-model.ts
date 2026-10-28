/** Serializable editor model and calculations shared by preview, storage and export. */
export type EditorTrackType =
  | "media"
  | "text"
  | "audio"
  | "overlay"
  | "subtitle";
export type FilterPreset =
  | "original"
  | "mono"
  | "warm"
  | "cool"
  | "vintage"
  | "contrast";
export type StickerShape =
  | "rectangle"
  | "circle"
  | "triangle"
  | "star"
  | "heart"
  | "arrow";
export type TransitionKind =
  | "crossfade"
  | "fadeblack"
  | "slide-left"
  | "slide-right";
export interface ClipTransition {
  targetId: string;
  kind: TransitionKind;
  duration: number;
}
export interface ClipAppearance {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  fit?: "contain" | "cover";
  filter?: FilterPreset;
  filterIntensity?: number;
  blur?: number;
  vignette?: number;
}
export interface EditorBaseElement {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  hidden?: boolean;
}
export interface EditorMediaElement extends EditorBaseElement {
  type: "media";
  mediaId: string;
  appearance?: ClipAppearance;
  volume?: number;
  muted?: boolean;
  freezeTime?: number;
  transitionOut?: ClipTransition;
}
export interface EditorTextElement extends EditorBaseElement {
  type: "text";
  role?: "subtitle" | "overlay";
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline" | "line-through";
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  sticker?: {
    shape: StickerShape | "image";
    mediaId?: string;
    width: number;
    height: number;
  };
}
export type EditorElement = EditorMediaElement | EditorTextElement;
export type CreateEditorElement =
  | Omit<EditorMediaElement, "id">
  | Omit<EditorTextElement, "id">;
export interface EditorTrack {
  id: string;
  name: string;
  type: EditorTrackType;
  elements: EditorElement[];
  muted?: boolean;
  isMain?: boolean;
}

/** Hidden is a visual flag; sound is controlled only by mute and frozen-source timing. */
export function isClipAudioEnabled(
  element: { type: string; muted?: boolean; freezeTime?: number },
  trackMuted = false
): boolean {
  return (
    element.type === "media" &&
    !trackMuted &&
    !element.muted &&
    element.freezeTime === undefined
  );
}
export const EDITOR_SCHEMA_VERSION = 2;
export const FILTER_PRESETS: { id: FilterPreset; name: string }[] = [
  { id: "original", name: "Original" },
  { id: "mono", name: "Black & white" },
  { id: "warm", name: "Warm" },
  { id: "cool", name: "Cool" },
  { id: "vintage", name: "Vintage" },
  { id: "contrast", name: "High contrast" },
];
export const STICKER_SHAPES: StickerShape[] = [
  "rectangle",
  "circle",
  "triangle",
  "star",
  "heart",
  "arrow",
];
export const TRANSITIONS: { id: TransitionKind; name: string }[] = [
  { id: "crossfade", name: "Cross dissolve" },
  { id: "fadeblack", name: "Fade through black" },
  { id: "slide-left", name: "Push left" },
  { id: "slide-right", name: "Push right" },
];
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export const visibleDuration = (element: EditorBaseElement) =>
  Math.max(0, element.duration - element.trimStart - element.trimEnd);
export const elementEnd = (element: EditorBaseElement) =>
  element.startTime + visibleDuration(element);
export function sourceTime(
  element: EditorBaseElement & { freezeTime?: number },
  time: number,
  fps = 30
): number {
  if (element.freezeTime !== undefined) return element.freezeTime;
  return clamp(
    time - element.startTime + element.trimStart,
    element.trimStart,
    Math.max(element.trimStart, element.duration - element.trimEnd - 1 / fps)
  );
}
export function appearanceFilter(a: ClipAppearance = {}): string {
  const i = clamp(a.filterIntensity ?? 1, 0, 1);
  const preset = a.filter ?? "original";
  const filters: string[] = [];
  if (preset === "mono") filters.push(`grayscale(${i})`);
  if (preset === "warm")
    filters.push(`sepia(${0.45 * i}) saturate(${1 + 0.3 * i})`);
  if (preset === "cool")
    filters.push(`sepia(${0.2 * i}) hue-rotate(${170 * i}deg)`);
  if (preset === "vintage")
    filters.push(`sepia(${0.65 * i}) contrast(${1 - 0.15 * i})`);
  if (preset === "contrast") filters.push(`contrast(${1 + 0.6 * i})`);
  filters.push(
    `brightness(${a.brightness ?? 1}) contrast(${a.contrast ?? 1}) saturate(${a.saturation ?? 1}) hue-rotate(${a.hue ?? 0}deg)`
  );
  if (a.blur) filters.push(`blur(${a.blur}px)`);
  return filters.join(" ");
}
export function containRect(
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  fit: "contain" | "cover" = "contain"
) {
  const scale = (fit === "cover" ? Math.max : Math.min)(
    width / sourceWidth,
    height / sourceHeight
  );
  const w = sourceWidth * scale,
    h = sourceHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
type SceneElement = EditorBaseElement & { transitionOut?: ClipTransition };
export interface SceneLayer<T extends SceneElement> {
  element: T;
  trackId: string;
  trackType: string;
  muted: boolean;
  alpha: number;
  offset: number;
  sampleTime: number;
  black?: boolean;
}
export function sceneLayers<T extends SceneElement>(
  tracks: { id: string; type: string; muted?: boolean; elements: T[] }[],
  time: number
): SceneLayer<T>[] {
  const layers: SceneLayer<T>[] = [];
  const ordered = [...tracks].sort(
    (a, b) =>
      Number(["text", "subtitle", "overlay"].includes(a.type)) -
      Number(["text", "subtitle", "overlay"].includes(b.type))
  );
  for (const track of ordered) {
    if (track.type === "audio") continue;
    const elements = [...track.elements].sort(
      (a, b) => a.startTime - b.startTime
    );
    const handled = new Set<string>();
    const add = (element: T, alpha = 1, offset = 0, black = false) => {
      handled.add(element.id);
      if (!element.hidden)
        layers.push({
          element,
          trackId: track.id,
          trackType: track.type,
          muted: !!track.muted,
          alpha,
          offset,
          sampleTime: clamp(
            time,
            element.startTime,
            Math.max(element.startTime, elementEnd(element) - 1e-6)
          ),
          black,
        });
    };
    for (let n = 0; n < elements.length - 1; n++) {
      const left = elements[n],
        right = elements[n + 1],
        tr = left.transitionOut;
      if (
        !tr ||
        tr.targetId !== right.id ||
        left.hidden ||
        right.hidden ||
        Math.abs(elementEnd(left) - right.startTime) > 1e-4
      )
        continue;
      const d = Math.min(
        tr.duration,
        visibleDuration(left),
        visibleDuration(right)
      );
      if (
        d <= 0 ||
        time < right.startTime - d / 2 ||
        time >= right.startTime + d / 2
      )
        continue;
      const p = clamp((time - right.startTime + d / 2) / d, 0, 1);
      if (tr.kind === "crossfade") {
        add(left);
        add(right, p);
      } else if (tr.kind === "fadeblack") {
        add(left, Math.max(0, 1 - p * 2), 0, true);
        add(right, Math.max(0, p * 2 - 1));
      } else {
        const direction = tr.kind === "slide-left" ? -1 : 1;
        add(left, 1, direction * p);
        add(right, 1, direction * (p - 1));
      }
    }
    for (const element of elements)
      if (
        !handled.has(element.id) &&
        time >= element.startTime &&
        time < elementEnd(element)
      )
        add(element);
  }
  return layers;
}
/** Clear dangling transitions after any structural timeline edit. Never mutates input. */
export function validateTransitions<T extends EditorTrack>(
  tracks: T[]
): { tracks: T[]; removed: number } {
  let removed = 0;
  const result = tracks.map((track) => {
    const sorted = [...track.elements].sort(
      (a, b) => a.startTime - b.startTime
    );
    return {
      ...track,
      elements: track.elements.map((element) => {
        if (element.type !== "media" || !element.transitionOut) return element;
        const next = sorted[sorted.indexOf(element) + 1];
        if (
          !next ||
          next.type !== "media" ||
          next.id !== element.transitionOut.targetId ||
          Math.abs(elementEnd(element) - next.startTime) > 1e-4
        ) {
          removed++;
          const { transitionOut, ...rest } = element;
          return rest;
        }
        return {
          ...element,
          transitionOut: {
            ...element.transitionOut,
            duration: Math.max(
              0.01,
              Math.min(
                element.transitionOut.duration,
                visibleDuration(element),
                visibleDuration(next)
              )
            ),
          },
        };
      }),
    };
  }) as T[];
  return { tracks: result, removed };
}
export function normalizeTimeline(tracks: EditorTrack[]): EditorTrack[] {
  return validateTransitions(
    tracks.map((track) => ({
      ...track,
      elements: track.elements.map((e) => {
        if (
          ![e.startTime, e.duration, e.trimStart, e.trimEnd].every(
            Number.isFinite
          ) ||
          e.startTime < 0 ||
          visibleDuration(e) <= 0
        )
          throw new Error(`Invalid timing for ${e.name}`);
        return e.type === "media"
          ? { ...e, volume: e.volume ?? 1, appearance: { ...e.appearance } }
          : { ...e };
      }),
    }))
  ).tracks;
}
export function insertFreezeFrame(
  tracks: EditorTrack[],
  trackId: string,
  elementId: string,
  time: number,
  seconds: number,
  makeId: () => string
): EditorTrack[] {
  const track = tracks.find((t) => t.id === trackId);
  const original = track?.elements.find((e) => e.id === elementId);
  if (
    !original ||
    original.type !== "media" ||
    original.freezeTime !== undefined ||
    time <= original.startTime ||
    time >= elementEnd(original)
  )
    throw new Error("Place the playhead inside a normal video clip");
  if (!Number.isFinite(seconds) || seconds <= 0)
    throw new Error("Freeze duration must be positive");
  const cut = sourceTime(original, time);
  const { transitionOut, ...base } = original;
  const left: EditorMediaElement = {
    ...base,
    trimEnd: original.duration - cut,
  };
  const frozen: EditorMediaElement = {
    ...base,
    id: makeId(),
    name: `${original.name} (freeze)`,
    startTime: time,
    duration: seconds,
    trimStart: 0,
    trimEnd: 0,
    freezeTime: cut,
    muted: true,
  };
  const right: EditorMediaElement = {
    ...original,
    id: makeId(),
    startTime: time + seconds,
    trimStart: cut,
  };
  return tracks.map((t) =>
    t.id !== trackId
      ? t
      : {
          ...t,
          elements: t.elements.flatMap((e) =>
            e.id === elementId
              ? [left, frozen, right]
              : [
                  {
                    ...e,
                    startTime:
                      e.startTime >= time ? e.startTime + seconds : e.startTime,
                  },
                ]
          ),
        }
  );
}
