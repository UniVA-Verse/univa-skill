"use client";
import { useRef, useState } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore, getImageDimensions } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { MediaElement, TextElement } from "@/types/timeline";
import {
  FILTER_PRESETS,
  STICKER_SHAPES,
  STICKER_PATHS,
  TRANSITIONS,
  visibleDuration,
  elementEnd,
  parseSubtitles,
  serializeSubtitles,
  type ClipAppearance,
  type StickerShape,
  type FilterPreset,
  type TransitionKind,
} from "@opencut/video-export";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block space-y-1 text-xs">
      {label}
      <input
        className="w-full rounded border bg-background p-2"
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        onBlur={() => {
          if (draft !== null) {
            const n = Number(draft);
            if (
              draft.trim() &&
              Number.isFinite(n) &&
              (min === undefined || n >= min) &&
              (max === undefined || n <= max)
            ) {
              if (n !== value) onChange(n);
            } else toast.error(`Invalid ${label.toLowerCase()}`);
          }
          setDraft(null);
        }}
      />
    </label>
  );
}
export function RangeField({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  const editing = useRef(false);
  return (
    <label className="block space-y-1 text-xs">
      {label} <span className="float-right">{value.toFixed(2)}</span>
      <input
        aria-label={label}
        className="w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          if (!editing.current) {
            useTimelineStore.getState().pushHistory();
            editing.current = true;
          }
          onChange(Number(e.target.value));
        }}
        onPointerUp={() => {
          editing.current = false;
        }}
        onKeyUp={() => {
          editing.current = false;
        }}
        onBlur={() => {
          editing.current = false;
        }}
      />
    </label>
  );
}
function useSelection() {
  const store = useTimelineStore();
  const selected =
    store.selectedElements.length === 1 ? store.selectedElements[0] : null;
  const track = store.tracks.find((t) => t.id === selected?.trackId);
  const element = track?.elements.find((e) => e.id === selected?.elementId);
  return { ...store, track, element };
}
function textElement(
  content: string,
  startTime: number,
  duration: number,
  y = 0
): Omit<TextElement, "id"> {
  return {
    type: "text",
    name: content.slice(0, 30) || "Sticker",
    content,
    startTime,
    duration,
    trimStart: 0,
    trimEnd: 0,
    fontSize: 48,
    fontFamily: "Arial",
    color: "#ffffff",
    backgroundColor: "transparent",
    textAlign: "center",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
    x: 0,
    y,
    rotation: 0,
    opacity: 1,
  };
}
function downloadText(content: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function EditingPanel({
  mode,
}: {
  mode: "effects" | "filters" | "adjustment" | "transitions";
}) {
  const { track, element, updateElement, tracks } = useSelection();
  const mediaItems = useMediaStore((s) => s.mediaItems);
  if (
    !element ||
    element.type !== "media" ||
    !track ||
    mediaItems.find((m) => m.id === element.mediaId)?.type === "audio"
  )
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Select one video or image clip to edit {mode}.
      </p>
    );
  const a = element.appearance ?? {};
  const change = (patch: Partial<ClipAppearance>, history = true) =>
    updateElement(
      track.id,
      element.id,
      { appearance: { ...a, ...patch } },
      history
    );
  const range = (
    key: keyof ClipAppearance,
    label: string,
    value: number,
    min: number,
    max: number
  ) => (
    <RangeField
      key={key}
      label={label}
      value={value}
      min={min}
      max={max}
      onChange={(n) => change({ [key]: n }, false)}
    />
  );
  if (mode === "transitions") {
    const ordered = [...track.elements].sort(
      (l, r) => l.startTime - r.startTime
    );
    const next = ordered[ordered.findIndex((e) => e.id === element.id) + 1];
    const nextMedia =
      next?.type === "media"
        ? mediaItems.find((m) => m.id === next.mediaId)
        : undefined;
    const valid =
      next?.type === "media" &&
      nextMedia &&
      nextMedia.type !== "audio" &&
      Math.abs(elementEnd(element) - next.startTime) < 1e-4;
    const setTransition = (
      kind: TransitionKind,
      duration = element.transitionOut?.duration ?? 0.5
    ) => {
      if (valid)
        updateElement(track.id, element.id, {
          transitionOut: {
            kind,
            targetId: next.id,
            duration: Math.min(
              duration,
              visibleDuration(element),
              visibleDuration(next)
            ),
          },
        });
    };
    return (
      <div className="space-y-4 p-4">
        <h3>Transitions</h3>
        <p className="text-xs text-muted-foreground">
          Apply at the end of the selected clip. Timeline length stays
          unchanged.
        </p>
        {!valid && (
          <p role="status" className="text-sm">
            Place another video or image directly after this clip.
          </p>
        )}
        {TRANSITIONS.map((t) => (
          <Button
            className="w-full"
            key={t.id}
            disabled={!valid}
            variant={
              element.transitionOut?.kind === t.id ? "default" : "outline"
            }
            onClick={() => setTransition(t.id)}
          >
            {t.name}
          </Button>
        ))}
        {element.transitionOut && (
          <>
            <NumberField
              label="Transition duration (seconds)"
              min={0.01}
              step={0.1}
              max={
                valid
                  ? Math.min(visibleDuration(element), visibleDuration(next))
                  : 10
              }
              value={element.transitionOut.duration}
              onChange={(n) => setTransition(element.transitionOut!.kind, n)}
            />
            <Button
              variant="outline"
              onClick={() =>
                updateElement(track.id, element.id, {
                  transitionOut: undefined,
                })
              }
            >
              Remove transition
            </Button>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4 p-4">
      <h3 className="capitalize">{mode}</h3>
      {mode === "effects" && (
        <>
          {range("blur", "Blur", a.blur ?? 0, 0, 30)}
          {range("vignette", "Vignette", a.vignette ?? 0, 0, 1)}
          <Button
            variant="outline"
            onClick={() => change({ blur: 0, vignette: 0 })}
          >
            Remove effects
          </Button>
        </>
      )}
      {mode === "filters" && (
        <>
          {FILTER_PRESETS.map((p) => (
            <Button
              className="w-full"
              key={p.id}
              variant={
                (a.filter ?? "original") === p.id ? "default" : "outline"
              }
              onClick={() => change({ filter: p.id })}
            >
              {p.name}
            </Button>
          ))}
          {range(
            "filterIntensity",
            "Filter intensity",
            a.filterIntensity ?? 1,
            0,
            1
          )}
          <Button
            variant="outline"
            onClick={() => change({ filter: "original", filterIntensity: 1 })}
          >
            Reset filter
          </Button>
        </>
      )}
      {mode === "adjustment" && (
        <>
          {range("brightness", "Brightness", a.brightness ?? 1, 0, 2)}
          {range("contrast", "Contrast", a.contrast ?? 1, 0, 2)}
          {range("saturation", "Saturation", a.saturation ?? 1, 0, 2)}
          {range("hue", "Hue", a.hue ?? 0, -180, 180)}
          <Button
            variant="outline"
            onClick={() =>
              change({ brightness: 1, contrast: 1, saturation: 1, hue: 0 })
            }
          >
            Reset adjustments
          </Button>
        </>
      )}
    </div>
  );
}
export function StickersPanel() {
  const add = useTimelineStore((s) => s.addDecorations);
  const images = useMediaStore((s) => s.mediaItems).filter(
    (m) => m.type === "image"
  );
  const input = useRef<HTMLInputElement>(null);
  const create = (shape: StickerShape | "image", mediaId?: string) => {
    const e = textElement(
      shape === "image" ? "Image sticker" : `${shape} sticker`,
      usePlaybackStore.getState().currentTime,
      3
    );
    e.sticker = { shape, mediaId, width: 180, height: 180 };
    add("overlay", [e]);
  };
  const upload = async (file?: File) => {
    const project = useProjectStore.getState().activeProject;
    if (!file || !project) return;
    try {
      const { width, height } = await getImageDimensions(file);
      await useMediaStore.getState().addMediaItem(project.id, {
        file,
        name: file.name,
        type: "image",
        url: URL.createObjectURL(file),
        width,
        height,
      });
      const item = useMediaStore
        .getState()
        .mediaItems.find((m) => m.file === file);
      if (item) create("image", item.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Cannot import image"
      );
    }
  };
  return (
    <div className="space-y-3 p-4">
      <h3>Stickers</h3>
      <div className="grid grid-cols-2 gap-2">
        {STICKER_SHAPES.map((shape) => (
          <Button
            variant="outline"
            className="h-20 flex-col gap-1"
            key={shape}
            onClick={() => create(shape)}
          >
            <svg viewBox="0 0 100 100" width="30" height="30" aria-hidden>
              <path d={STICKER_PATHS[shape]} fill="currentColor" />
            </svg>
            {shape}
          </Button>
        ))}
      </div>
      <Button onClick={() => input.current?.click()}>
        Upload image sticker
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload sticker image"
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {images.map((m) => (
        <Button
          key={m.id}
          variant="outline"
          className="w-full truncate"
          onClick={() => create("image", m.id)}
        >
          {m.name}
        </Button>
      ))}
    </div>
  );
}
export function CaptionsPanel() {
  const { tracks, addDecorations, updateElement, selectElement } =
    useTimelineStore();
  const input = useRef<HTMLInputElement>(null);
  const height = useEditorStore((s) => s.canvasSize.height);
  const captions = tracks.flatMap((t) =>
    t.elements
      .filter(
        (e): e is TextElement => e.type === "text" && e.role === "subtitle"
      )
      .map((e) => ({ trackId: t.id, element: e }))
  );
  const create = () =>
    addDecorations("subtitle", [
      {
        ...textElement(
          "New caption",
          usePlaybackStore.getState().currentTime,
          3,
          height * 0.38
        ),
        backgroundColor: "#101820",
      },
    ]);
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const cues = parseSubtitles(await file.text());
      addDecorations(
        "subtitle",
        cues.map((c) => ({
          ...textElement(c.text, c.start, c.end - c.start, height * 0.38),
          backgroundColor: "#101820",
        }))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Cannot import subtitles"
      );
    }
  };
  const exportFile = (format: "srt" | "vtt") =>
    downloadText(
      serializeSubtitles(
        captions
          .filter((c) => !c.element.hidden)
          .map(({ element: e }) => ({
            start: e.startTime,
            end: elementEnd(e),
            text: e.content,
          })),
        format
      ),
      `captions.${format}`
    );
  return (
    <div className="space-y-3 p-4">
      <h3>Captions</h3>
      <Button onClick={create}>Add caption</Button>
      <Button variant="outline" onClick={() => input.current?.click()}>
        Import SRT / VTT
      </Button>
      <input
        ref={input}
        className="hidden"
        type="file"
        accept=".srt,.vtt"
        aria-label="Import subtitles"
        onChange={(e) => {
          importFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={!captions.length}
          onClick={() => exportFile("srt")}
        >
          Export SRT
        </Button>
        <Button
          variant="outline"
          disabled={!captions.length}
          onClick={() => exportFile("vtt")}
        >
          Export VTT
        </Button>
      </div>
      {captions
        .sort((a, b) => a.element.startTime - b.element.startTime)
        .map(({ trackId, element: e }) => (
          <div
            key={e.id}
            className="space-y-2 rounded border p-2"
            onClick={() => selectElement(trackId, e.id)}
          >
            <textarea
              className="w-full bg-background p-2"
              aria-label="Caption text"
              value={e.content}
              onChange={(event) =>
                updateElement(trackId, e.id, { content: event.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Start (seconds)"
                min={0}
                step={0.1}
                value={e.startTime}
                onChange={(n) => updateElement(trackId, e.id, { startTime: n })}
              />
              <NumberField
                label="Duration (seconds)"
                min={0.01}
                step={0.1}
                value={visibleDuration(e)}
                onChange={(n) =>
                  updateElement(trackId, e.id, {
                    duration: n,
                    trimStart: 0,
                    trimEnd: 0,
                  })
                }
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                useTimelineStore
                  .getState()
                  .removeElementFromTrack(trackId, e.id)
              }
            >
              Delete caption
            </Button>
          </div>
        ))}
    </div>
  );
}
export function ClipProperties({
  element,
  audioOnly = false,
}: {
  element: MediaElement;
  audioOnly?: boolean;
}) {
  const store = useTimelineStore();
  const track = store.tracks.find((t) =>
    t.elements.some((e) => e.id === element.id)
  );
  if (!track) return null;
  const a = element.appearance ?? {};
  const patch = (
    updates: Parameters<typeof store.updateElement>[2],
    history = true
  ) => store.updateElement(track.id, element.id, updates, history);
  const appearance = (updates: Partial<ClipAppearance>, history = true) =>
    patch({ appearance: { ...a, ...updates } }, history);
  return (
    <div className="space-y-4 p-4">
      <h3>{audioOnly ? "Audio" : "Clip"} properties</h3>
      {!audioOnly && (
        <>
          <NumberField
            label="Position X"
            value={a.x ?? 0}
            onChange={(x) => appearance({ x })}
          />
          <NumberField
            label="Position Y"
            value={a.y ?? 0}
            onChange={(y) => appearance({ y })}
          />
          <NumberField
            label="Scale"
            min={0.05}
            max={10}
            step={0.1}
            value={a.scale ?? 1}
            onChange={(scale) => appearance({ scale })}
          />
          <NumberField
            label="Rotation"
            value={a.rotation ?? 0}
            onChange={(rotation) => appearance({ rotation })}
          />
          <RangeField
            label="Opacity"
            value={a.opacity ?? 1}
            onChange={(opacity) => appearance({ opacity }, false)}
          />
        </>
      )}
      <RangeField
        label="Clip volume"
        value={element.volume ?? 1}
        onChange={(volume) => patch({ volume }, false)}
      />
      <label className="flex gap-2 text-sm">
        <input
          aria-label="Mute clip"
          type="checkbox"
          checked={!!element.muted}
          onChange={(e) => patch({ muted: e.target.checked })}
        />
        Mute clip
      </label>
      {element.freezeTime !== undefined && (
        <NumberField
          label="Freeze duration (seconds)"
          min={0.1}
          step={0.1}
          value={element.duration}
          onChange={(duration) => patch({ duration })}
        />
      )}
      {!audioOnly && (
        <Button variant="outline" onClick={() => patch({ appearance: {} })}>
          Reset appearance
        </Button>
      )}
    </div>
  );
}
export function DecorationProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const update = useTimelineStore((s) => s.updateElement);
  const patch = (p: Parameters<typeof update>[2], history = true) =>
    update(trackId, element.id, p, history);
  return (
    <div className="space-y-3 p-4">
      <h3>{element.sticker ? "Sticker" : "Caption"} properties</h3>
      <NumberField
        label="Start (seconds)"
        min={0}
        step={0.1}
        value={element.startTime}
        onChange={(startTime) => patch({ startTime })}
      />
      <NumberField
        label="Duration (seconds)"
        min={0.01}
        step={0.1}
        value={visibleDuration(element)}
        onChange={(duration) => patch({ duration, trimStart: 0, trimEnd: 0 })}
      />
      <NumberField
        label="Position X"
        value={element.x}
        onChange={(x) => patch({ x })}
      />
      <NumberField
        label="Position Y"
        value={element.y}
        onChange={(y) => patch({ y })}
      />
      <NumberField
        label="Rotation"
        value={element.rotation}
        onChange={(rotation) => patch({ rotation })}
      />
      <RangeField
        label="Opacity"
        value={element.opacity}
        onChange={(opacity) => patch({ opacity }, false)}
      />
      {element.sticker && (
        <>
          <NumberField
            label="Width"
            min={1}
            value={element.sticker.width}
            onChange={(width) =>
              patch({ sticker: { ...element.sticker!, width } })
            }
          />
          <NumberField
            label="Height"
            min={1}
            value={element.sticker.height}
            onChange={(height) =>
              patch({ sticker: { ...element.sticker!, height } })
            }
          />
          <label className="block text-xs">
            Sticker color
            <input
              type="color"
              aria-label="Sticker color"
              value={element.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}
