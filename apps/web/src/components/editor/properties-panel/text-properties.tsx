import type { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { NumberField, RangeField } from "../editing-controls";
import { FONT_CLASS_MAP } from "@/lib/font-config";
export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const update = useTimelineStore((s) => s.updateElement);
  const patch = (updates: Parameters<typeof update>[2], history = true) =>
    update(trackId, element.id, updates, history);
  return (
    <div className="space-y-4 p-4">
      <label className="block text-xs">
        Text
        <textarea
          aria-label="Text content"
          className="w-full rounded border bg-background p-2"
          value={element.content}
          onChange={(e) => patch({ content: e.target.value })}
        />
      </label>
      <label className="block text-xs">
        Font
        <select
          className="w-full rounded border bg-background p-2"
          aria-label="Font family"
          value={element.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value })}
        >
          {Object.keys(FONT_CLASS_MAP).map((font) => (
            <option key={font}>{font}</option>
          ))}
        </select>
      </label>
      <NumberField
        label="Font size"
        min={8}
        max={300}
        value={element.fontSize}
        onChange={(fontSize) => patch({ fontSize })}
      />
      <label className="block text-xs">
        Text color
        <input
          aria-label="Text color"
          type="color"
          value={element.color}
          onChange={(e) => patch({ color: e.target.value })}
        />
      </label>
      <label className="flex gap-2 text-xs">
        <input
          type="checkbox"
          checked={element.backgroundColor !== "transparent"}
          onChange={(e) =>
            patch({
              backgroundColor: e.target.checked ? "#101820" : "transparent",
            })
          }
        />
        Text background
      </label>
      {element.backgroundColor !== "transparent" && (
        <input
          aria-label="Text background color"
          type="color"
          value={element.backgroundColor}
          onChange={(e) => patch({ backgroundColor: e.target.value })}
        />
      )}
      <label className="block text-xs">
        Alignment
        <select
          aria-label="Text alignment"
          className="w-full rounded border bg-background p-2"
          value={element.textAlign}
          onChange={(e) =>
            patch({ textAlign: e.target.value as TextElement["textAlign"] })
          }
        >
          {["left", "center", "right"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="flex gap-2 text-xs">
        <input
          type="checkbox"
          aria-label="Bold"
          checked={element.fontWeight === "bold"}
          onChange={(e) =>
            patch({ fontWeight: e.target.checked ? "bold" : "normal" })
          }
        />
        Bold
      </label>
      <label className="flex gap-2 text-xs">
        <input
          type="checkbox"
          aria-label="Italic"
          checked={element.fontStyle === "italic"}
          onChange={(e) =>
            patch({ fontStyle: e.target.checked ? "italic" : "normal" })
          }
        />
        Italic
      </label>
      <label className="block text-xs">
        Decoration
        <select
          aria-label="Text decoration"
          className="w-full rounded border bg-background p-2"
          value={element.textDecoration}
          onChange={(e) =>
            patch({
              textDecoration: e.target.value as TextElement["textDecoration"],
            })
          }
        >
          {["none", "underline", "line-through"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {!element.role && (
        <>
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
        </>
      )}
    </div>
  );
}
