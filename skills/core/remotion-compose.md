# Remotion Compose - Core Skill

## When to Use

Use when an approved final packaging stage needs captions, title cards, lower thirds, CTA, brand marks, progress bars, data cards, layout, or final rendered presentation.

## Execution-Time Contract Source

For normal task execution, this file is the MCP contract source for function name, parameters, defaults, return fields, output path policy, and failure shape. Read `univa/mcp_tools` implementation only when maintaining this contract, adding/changing a tool, debugging an observed mismatch, or when this skill lacks the required contract.

## Covered Tools

- `remotion_compose_video`

## Tool Contract

`remotion_compose_video` calls the existing local `packages/remotion-compose` runtime. It does not contact a generation provider. The request remains subject to the media review gate, including deterministic product presentations based on real screen recordings.

| Parameter | Type | Default | Meaning |
|---|---|---|---|
| `input_video_path` | `str` | required | Existing video or WebM screen recording. Never modified in place. |
| `output_path` | `str \| None` | `None` | New MP4; default under `univa/results/<timestamp>_remotion_compose/`. Use an approved project-local `results/` location. |
| `title`, `subtitle` | `str \| None` | `None` | Legacy intro treatment. |
| `captions` | `list \| None` | `None` | Legacy `{text,startSeconds,endSeconds}` cues; snake-case timing aliases also accepted. |
| `overlays` | `list \| None` | `None` | Legacy timed cards: `type` (`title_card/lower_third/callout/badge/cta/stat`), `text`, `startSeconds`, `endSeconds`, optional `id/position/eyebrow/value/accentColor`. Positions: `top_left/top_right/lower_left/lower_right/center/bottom_center`. |
| `brand`, `theme` | `dict \| None` | `None` | Legacy brand (`name/logoSrc`) and theme (`backgroundColor/surfaceColor/textColor/mutedTextColor/accentColor/captionBackground`). |
| `width`, `height` | `int \| None` | source dimensions | Positive even output dimensions, at least 16. |
| `fps` | `int \| None` | configured, otherwise `30` | Output fps, 1–120. |
| `show_progress` | `bool` | `True` | Legacy progress bar. Presentation mode always omits legacy layers and this bar. |
| `fit` | `str` | `"cover"` | Legacy `cover/contain`; presentation mode uses its crop and preserves pixel aspect ratio. |
| `browser_executable_path` | `str \| None` | auto/configured | Explicit local Chrome is recommended. On this Mac: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. |
| `remotion_binaries_directory` | `str \| None` | auto/configured | Optional compatible compositor directory. |
| `remotion_timeout_ms` | `int \| None` | `None` | CLI timeout; process timeout is at least 600 seconds. |
| `fallback_to_ffmpeg_subtitles` | `bool \| None` | configured, otherwise `True` | Legacy caption-only fallback. **Never used in presentation mode**, because it would drop the approved spatial edit. Set `False` for a product film. |
| `presentation` | `dict \| None` | `None` | Version 1 product presentation below. Omission preserves the existing rendering behavior. |

Returns `ToolResponse` with `success`, `output_path`, `message` or `error`, and `content`. Success content includes `method="remotion"`, input path, staged `props_path`, duration/fps/dimensions, caption/overlay counts, `presentation_scene_count`, `source_audio_muted`, browser and binary paths. An invalid request returns `success=False` before a render job is staged. A presentation render failure returns `success=False`; it cannot silently become a caption-only render. Verify the actual output and do not infer readiness from installation checks alone.

### `presentation` version 1

The only source picture is the real `input_video_path`; scenes may select and repeat different sections of that recording. This mode contains no generated application UI. The runtime stages the existing source and optional soundtrack in its existing `public/jobs/<id>/` directory. It renders H.264 CRF 18 using the requested size and fps.

Top-level fields (unknown fields are rejected):

| Field | Type / default | Contract |
|---|---|---|
| `version` | integer, required `1` | Schema version. |
| `muted` | boolean, required | Mute only the original recording in every screen scene. Does not mute an explicitly supplied soundtrack. Title scenes contain no source audio. |
| `scenes` | array, required | 1–48 contiguous scenes, first starts at zero, no gaps or overlap, each at least 0.5 seconds. Final end determines output duration, maximum 600 seconds. |
| `soundtrack_path` | optional string | Existing **project-local** audio/video with a readable audio stream and enough duration to cover the entire presentation. Relative paths resolve against repository root; symlinks escaping the repository, remote URLs, missing files and implicit downloads are rejected. Accepted extensions: `.wav/.mp3/.m4a/.aac/.flac/.ogg/.mp4/.mov/.webm`. Source is copied into the render job; no overwrite, looping, speech generation or network music service. |
| `soundtrack_volume` | number `0..1`, default `0.6` | Only permitted with a soundtrack. |
| `soundtrack_start_seconds` | number, default `0` | Source offset on the output-frame grid; the remaining audio must cover the whole presentation. No implicit looping. Only permitted with a soundtrack. |
| `soundtrack_fade_seconds` | number `0..3`, default `0.8` | Linear fade at each end; clamped to half the final duration. Only permitted with a soundtrack. |

Common scene fields:

- `id`: optional unique nonempty string, default `scene_01`, etc.
- `kind`: required `"title"` or `"screen"`.
- `start_seconds`, `end_seconds`: required finite numbers on the requested output frame grid. Times are absolute output times. They must be contiguous and increasing.
- `background`: six-digit hex color, default `"#050505"`.
- `color_scheme`: `"dark"` (light text) or `"light"` (dark text), default `"dark"`.
- `transition_out`: `"cut"` (default, continuous picture until the boundary) or `"fade"` (fade the picture/copy to this scene's background over its final 0.2 seconds). Use cuts between active UI beats; reserve fades for deliberate rests.
- `eyebrow`, `headline`, `subheadline`: optional exact plain text, including explicit newlines. Maximum lengths 100/240/500 characters. Title scenes require a headline. Use short lines and visually verify all approved copy.

Screen-only fields:

- `source_start_seconds`: source time at the beginning of this scene, default `0`, output-frame aligned. Source time is `source_start_seconds + local_output_seconds * playback_rate`; the final sampled frame must exist. No freeze extension or synthetic frames.
- `playback_rate`: number `0.25..4`, default `1`.
- `layout`: `"window"` (default) or `"full"`. `window` contains the cropped source inside 90% of output width and 88% height; when any copy is present, height is 72% with text above. It adds rounded corners of 1.25% output width and a restrained shadow. `full` contains the cropped source across the full output, with square corners; optional text overlays its upper-left. Neither distorts source pixels.
- `crop`: `{x,y,width,height}`, normalized fractions of the original recording. Defaults `{x:0,y:0,width:1,height:1}`; width/height at least `0.05`; crop must remain inside the source. This is deterministic cropping of authentic UI, not a replacement or redraw.
- `camera`: optional object with the following numeric fields. Values interpolate with smoothstep easing across the scene. Unknown fields are errors. Source crop remains clipped inside the screen viewport.

| Camera fields | Range | Defaults | Meaning |
|---|---|---|---|
| `scale_from`, `scale_to` | `1..3` | `1` | Zoom source pixels inside the viewport. |
| `focus_x_from/to`, `focus_y_from/to` | `0..1` | `0.5` | Normalized zoom anchor inside the crop; moving the anchor pans while zoomed. |
| `rotate_x_from/to`, `rotate_y_from/to` | `-18..18` degrees | `0` | 3D transform of the screen viewport using CSS `perspective(1200px)`. |
| `translate_x_from/to`, `translate_y_from/to` | `-0.25..0.25` | `0` | Screen translation as a fraction of output width/height. Large crops, deliberate camera movement and actual source actions can carry a continuous product film without repeated title cards. |

Presentation copy uses the local system sans-serif stack and a 0.5-second smooth opacity/vertical entrance; scene ends cut directly unless `transition_out="fade"` is explicitly selected. Titles are centered with large type; screen copy is placed above a window or upper-left over full footage. No legacy gradient veil, card border, brand badge or progress bar is added. Scenes switch on their exact frame boundaries. This is packaging motion; it does not invent product behavior.

`presentation` cannot be combined with nonempty legacy `title/subtitle/captions/overlays/brand/theme`. `show_progress` and `fit` are legacy-only when a presentation is supplied. The review must show the entire presentation, source hash/metadata, exact wording, camera values, audio provenance and explicit mute policy. A revised presentation is a new plan version requiring approval.

### Complete request example (planning only)

```json
{
  "input_video_path": "results/product-promo/real-editor-recording.webm",
  "output_path": "results/product-promo/univa-product-film.mp4",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "show_progress": false,
  "browser_executable_path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "fallback_to_ffmpeg_subtitles": false,
  "presentation": {
    "version": 1,
    "muted": true,
    "scenes": [
      {"id":"brand","kind":"title","start_seconds":0,"end_seconds":1,"headline":"UniVA","background":"#050505","color_scheme":"dark"},
      {"id":"editor","kind":"screen","start_seconds":1,"end_seconds":7,"source_start_seconds":4,"playback_rate":1,"layout":"window","background":"#050505","color_scheme":"dark","crop":{"x":0,"y":0,"width":1,"height":1},"camera":{"scale_from":1,"scale_to":1.4,"focus_x_from":0.5,"focus_x_to":0.65,"focus_y_from":0.5,"focus_y_to":0.55,"rotate_y_from":-8,"rotate_y_to":0,"translate_x_from":-0.03,"translate_x_to":0}}
    ]
  }
}
```

This illustrative request is not approval. Input media must actually exist and cover the approved source ranges. Optional soundtrack fields may be added only after the file, rights, exact volume, timing and fade have been reviewed.

## Tool Contract Rules

- Build the MCP request from the approved plan or proposal artifact.
- Include optional fields that materially affect behavior, such as `duration_seconds`, `aspect_ratio`, `auto_audio`, `include_voiceover`, `audio_prompt`, `transition_plan`, `transition_duration_seconds`, `image_path`, `images_num`, `type`, `return_mask`, `keep_original_audio`, `mux_output_path`, and output directory fields when relevant.
- Return handling must check `success`, `output_path` or content fields, `message`, and `error` fields. A missing or empty output path is not a delivered artifact.
- Output files must be placed under `data/`, `results/`, or `univa/results/` unless the approved request specifies another safe project-local location.

## Required Behavior

Remotion is a final packaging layer after media approval, not a substitute for generation approval. Use it when deterministic overlays, readable text, branding, or layout are required.

## Process

1. Load the media review gate and the task-specific pipeline/creative/user preference skills.
2. Validate source assets, required keys, configured provider/model, local dependencies, and output directories before tool execution.
3. Create or consume the approved plan/proposal artifact. The request sent to the MCP tool must match the approved contract exactly.
4. Call the existing UniVA MCP tool; do not create a parallel provider runtime.
5. Verify real output files, non-zero size, readable format, and task-specific quality checks.
6. Write or update delivery reporting with the approved plan path, review/decision path, tool result, final artifacts, deviations, and failures.

## Common Pitfalls

- Calling a media-producing or media-mutating tool before the review artifact is approved.
- Sending the user's short prompt when an approved expanded prompt exists.
- Dropping optional fields that change audio, duration, transition, source preservation, or output behavior.
- Reporting a path as delivered before checking that the file exists and is usable.
- Inventing an alternate runtime when UniVA already has a registered MCP tool.
