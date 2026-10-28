# UniVA Skill

<p align="center">
  <a href="https://univa.online"><img src="https://img.shields.io/badge/Project-Website-orange" alt="Website"></a>
  <a href="https://arxiv.org/abs/2511.08521"><img src="https://img.shields.io/badge/Paper-arXiv-brightgreen" alt="Paper"></a>
  <a href="https://huggingface.co/datasets/UniVA-Agent/UniVA-Bench"><img src="https://img.shields.io/badge/Benchmark-UniVA--Bench-yellow" alt="Benchmark"></a>
  <a href="https://huggingface.co/spaces/UniVA-Agent/UniVA-Leaderboard"><img src="https://img.shields.io/badge/Leaderboard-HuggingFace-gold" alt="Leaderboard"></a>
  <a href="https://discord.gg/85GkGW897V"><img src="https://img.shields.io/badge/Community-Discord-blueviolet" alt="Community"></a>
</p>

<p align="center"><img src="docs/assets/readme/Univa-skill.png" alt="UniVA Skill" width="85%"></p>

English · [简体中文](README.zh-CN.md)

**Reusable skills for agent-driven video and audio production.**

UniVA Skill brings creative guidance, tool contracts and production workflows into one repository. Codex, Claude Code, the backend API and the Web editor use the same skills and MCP media tools.

## Demo Gallery

New demos and earlier video examples, together. Click a cover to play. [Three-demo showcase](docs/showcase/index.html).

<table>
  <tr>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/skill-films/ink.mp4"><img src="docs/assets/readme/skill-films/ink.jpg" alt="A Crane Opens the Mountains" width="100%"></a>
      <br><b>A Crane Opens the Mountains</b>
      <br><sub>Ink fantasy · 20 seconds</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/skill-films/story.mp4"><img src="docs/assets/readme/skill-films/story.jpg" alt="The Last Light" width="100%"></a>
      <br><b>The Last Light</b>
      <br><sub>Science fiction · 20 seconds</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/skill-films/product.mp4"><img src="docs/assets/readme/skill-films/product.jpg" alt="IOTA ONE · Precision in Motion" width="100%"></a>
      <br><b>IOTA ONE · Precision in Motion</b>
      <br><sub>Product film · 20 seconds</sub>
    </td>
  </tr>
  <tr>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/tokyo-olympics-promo-with-audio.mp4"><img src="docs/assets/readme/olympics.png" alt="Sports Promo" width="100%"></a>
      <br><b>Sports Promo</b><br><sub>Video</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/stadium-crowd-story.mp4"><img src="docs/assets/readme/smooth-crossfade-poster.jpg" alt="Stadium Crowd" width="100%"></a>
      <br><b>Stadium Crowd</b><br><sub>Video</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/desert-car.mp4"><img src="docs/assets/readme/desert.png" alt="Desert Drive" width="100%"></a>
      <br><b>Desert Drive</b><br><sub>Video</sub>
    </td>
  </tr>
</table>

## Capabilities

| Area | Includes |
|---|---|
| Video | Text-to-video, image-to-video, continuation and multi-shot assembly. |
| Editing & analysis | Video editing, content and shot analysis, and tracking. |
| Audio | Music, ambience, sound effects and speech. |
| Localization | Speech transcription, subtitle translation, bilingual captions and localized voiceover. |
| Preferences | Reusable style, camera and workflow preferences. |
| Web editor | Media imports, timeline editing, stickers, captions, effects, transitions, filters, color adjustment, freeze frames, undo/redo and MP4 export. |

Capabilities depend on the configured providers and local model dependencies.

## Workflow

```text
Brief → Relevant skills → Plan & review → Tool execution → Output checks
```

Skills define creative direction, tool inputs and outputs, and workflow stages. Media generation and editing require review of the concrete plan before execution. See the [review rules](skills/meta/media-review-gate.md) and [Skill index](skills/INDEX.md).

## Quickstart

Requires **Python 3.10+** and **FFmpeg / ffprobe**. [Platform-specific installation](docs/local-setup-reference.md#quickstart).

Run from the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.runtime.txt
```

Configure the providers and keys you need in `.env`, using [.env.example](.env.example) as a reference. Then configure MCP and check the local environment:

```bash
python scripts/configure_mcp_servers.py
python scripts/preflight_media_runtime.py
```

## Use With an Agent

Ask your agent to read [AGENTS.md](AGENTS.md), then describe the task. Direct agent workflows can run without the backend server. See the [Codex guide](skills/agent-integrations/codex-univa-video-ops/SKILL.md) or [Claude Code guide](skills/agent-integrations/claude-code-univa-video-ops/SKILL.md).

```text
Create a three-shot ink-wash short with wind and water ambience.
Analyze this video's story, camera work and editing rhythm.
Save a preference: restrained lighting, smooth camera movement, no voiceover.
```

## Local Web Editor

Requires **Bun**. Run from the repository root:

```bash
bun install
bun run --cwd apps/web dev:local
```

Open **http://127.0.0.1:3000/projects**. Local editing needs no database or provider key; projects are stored in the current browser. Use desktop Chrome for MP4 export.

For AI Chat, also configure the Python environment above and start the backend in another terminal:

```bash
UNIVA_SERVER_HOST=127.0.0.1 AUTH_ENABLED=false python -m univa.univa_server
```

## Development Checks

After installing the dependencies, run `bun run lint`, `bun run check-types`, and `bun run build:local` to check formatting, workspace types, and the local production build without calling media providers.

Use `bun run check:repo` for a quick scan before committing. Local keys, MCP configuration, caches, logs, and intermediate renders are ignored; commit `.env.example` templates and regenerate MCP configuration with `scripts/configure_mcp_servers.py` on each machine. Public demos remain under `docs/assets/readme/`.
