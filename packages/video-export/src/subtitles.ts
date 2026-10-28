export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}
function parseTime(value: string): number {
  const match = value.trim().match(/^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match || +match[2] > 59 || +match[3] > 59)
    throw new Error(`Invalid subtitle timestamp: ${value}`);
  return (
    +(match[1] || 0) * 3600 + +match[2] * 60 + +match[3] + +match[4] / 1000
  );
}
export function parseSubtitles(content: string): SubtitleCue[] {
  const text = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const blocks = text
    .replace(/^WEBVTT[^\n]*(?:\n|$)/, "")
    .trim()
    .split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    if (!block.trim() || /^(NOTE|STYLE|REGION)(\s|$)/.test(block)) continue;
    const lines = block.split("\n");
    const timing = lines.findIndex((line) => line.includes("-->"));
    if (timing < 0) throw new Error("Subtitle block is missing a time range");
    const match = lines[timing].match(/^(.+?)\s+-->\s+(\S+)(?:\s+.*)?$/);
    if (!match) throw new Error("Invalid subtitle time range");
    const start = parseTime(match[1]),
      end = parseTime(match[2]);
    const caption = lines
      .slice(timing + 1)
      .join("\n")
      .trim();
    if (end <= start || !caption)
      throw new Error("Each subtitle needs text and a positive duration");
    cues.push({ start, end, text: caption });
  }
  if (!cues.length) throw new Error("No subtitles found");
  return cues.sort((a, b) => a.start - b.start);
}
function timestamp(value: number, vtt: boolean): string {
  const ms = Math.round(value * 1000);
  return `${Math.floor(ms / 3_600_000)
    .toString()
    .padStart(2, "0")}:${Math.floor((ms / 60_000) % 60)
    .toString()
    .padStart(2, "0")}:${Math.floor((ms / 1000) % 60)
    .toString()
    .padStart(
      2,
      "0"
    )}${vtt ? "." : ","}${(ms % 1000).toString().padStart(3, "0")}`;
}
export function serializeSubtitles(
  cues: SubtitleCue[],
  format: "srt" | "vtt"
): string {
  return (
    (format === "vtt" ? "WEBVTT\n\n" : "") +
    [...cues]
      .sort((a, b) => a.start - b.start)
      .map(
        (cue, n) =>
          `${format === "srt" ? `${n + 1}\n` : ""}${timestamp(cue.start, format === "vtt")} --> ${timestamp(cue.end, format === "vtt")}\n${cue.text}\n`
      )
      .join("\n")
  );
}
