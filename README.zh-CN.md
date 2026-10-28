# UniVA Skill

<p align="center">
  <a href="https://univa.online"><img src="https://img.shields.io/badge/Project-Website-orange" alt="项目主页"></a>
  <a href="https://arxiv.org/abs/2511.08521"><img src="https://img.shields.io/badge/Paper-arXiv-brightgreen" alt="论文"></a>
  <a href="https://huggingface.co/datasets/UniVA-Agent/UniVA-Bench"><img src="https://img.shields.io/badge/Benchmark-UniVA--Bench-yellow" alt="评测数据集"></a>
  <a href="https://huggingface.co/spaces/UniVA-Agent/UniVA-Leaderboard"><img src="https://img.shields.io/badge/Leaderboard-HuggingFace-gold" alt="排行榜"></a>
  <a href="https://discord.gg/85GkGW897V"><img src="https://img.shields.io/badge/Community-Discord-blueviolet" alt="社区"></a>
</p>

<p align="center"><img src="docs/assets/readme/Univa-skill.png" alt="UniVA Skill" width="85%"></p>

[English](README.md) · 简体中文

**为智能体提供可复用的视频与音频制作技能。**

UniVA Skill 将创意指导、工具契约与制作流程集中在一个仓库中。Codex、Claude Code、后端 API 和 Web 编辑器共用同一套 Skill 与 MCP 媒体工具。

## Demo 图库

新 Demo 与原有视频案例统一展示，点击封面播放。[三支新 Demo 的完整展示页](docs/showcase/index.html)。

<table>
  <tr>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/skill-films/ink.mp4"><img src="docs/assets/readme/skill-films/ink.jpg" alt="一鹤开山" width="100%"></a>
      <br><b>一鹤开山</b>
      <br><sub>水墨幻想 · 20 秒</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/skill-films/story.mp4"><img src="docs/assets/readme/skill-films/story.jpg" alt="最后一束光" width="100%"></a>
      <br><b>最后一束光</b>
      <br><sub>科幻叙事 · 20 秒</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/skill-films/product.mp4"><img src="docs/assets/readme/skill-films/product.jpg" alt="IOTA ONE · 让精密成为感受" width="100%"></a>
      <br><b>IOTA ONE · 让精密成为感受</b>
      <br><sub>工业产品广告 · 20 秒</sub>
    </td>
  </tr>
  <tr>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/tokyo-olympics-promo-with-audio.mp4"><img src="docs/assets/readme/olympics.png" alt="体育宣传片" width="100%"></a>
      <br><b>体育宣传片</b><br><sub>视频</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/stadium-crowd-story.mp4"><img src="docs/assets/readme/smooth-crossfade-poster.jpg" alt="体育观众" width="100%"></a>
      <br><b>体育观众</b><br><sub>视频</sub>
    </td>
    <td width="33.33%" align="center" valign="top">
      <a href="docs/assets/readme/desert-car.mp4"><img src="docs/assets/readme/desert.png" alt="沙漠越野" width="100%"></a>
      <br><b>沙漠越野</b><br><sub>视频</sub>
    </td>
  </tr>
</table>

## 核心能力

| 领域 | 包含内容 |
|---|---|
| 视频 | 文生视频、图生视频、续接与多镜头合成。 |
| 编辑与分析 | 视频编辑、内容与镜头分析、视频跟踪。 |
| 音频 | 配乐、环境声、音效与语音。 |
| 本地化 | 语音转写、字幕翻译、双语字幕与本地化配音。 |
| 用户偏好 | 可复用的风格、运镜和工作流偏好。 |
| Web 编辑器 | 素材导入、时间线编辑、贴纸、字幕、特效、转场、滤镜、调色、冻结帧、撤销重做和 MP4 导出。 |

具体能力取决于已配置的供应商与本地模型依赖。

## 工作流程

```text
创意需求 → 相关 Skill → 计划与审阅 → 工具执行 → 产物检查
```

Skill 定义创意方向、工具输入输出与工作流阶段。媒体生成和编辑需先审阅具体计划，再执行。详见[审阅规则](skills/meta/media-review-gate.md)与 [Skill 索引](skills/INDEX.md)。

## 快速开始

需要 **Python 3.10+** 和 **FFmpeg / ffprobe**。[不同平台的安装说明](docs/local-setup-reference.zh-CN.md#快速开始)。

在仓库根目录运行：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.runtime.txt
```

参考 [.env.example](.env.example)，在 `.env` 中填写所需的供应商配置和密钥，然后配置 MCP 并检查本地环境：

```bash
python scripts/configure_mcp_servers.py
python scripts/preflight_media_runtime.py
```

## 通过智能体使用

让智能体先阅读 [AGENTS.md](AGENTS.md)，再描述任务。直接运行智能体工作流无需启动后端，具体入口见 [Codex 指南](skills/agent-integrations/codex-univa-video-ops/SKILL.md)或 [Claude Code 指南](skills/agent-integrations/claude-code-univa-video-ops/SKILL.md)。

```text
制作一支三个镜头的水墨短片，配上风声和水声。
分析这段视频的故事、运镜和剪辑节奏。
保存偏好：克制的光影、平稳运镜、无旁白。
```

## 本机 Web 编辑器

需要 **Bun**。在仓库根目录运行：

```bash
bun install
bun run --cwd apps/web dev:local
```

打开 **http://127.0.0.1:3000/projects**。本地编辑无需数据库或供应商密钥，项目保存在当前浏览器中。MP4 导出请使用桌面 Chrome。

如需 AI Chat，还需完成上方 Python 环境配置，并在另一终端启动后端：

```bash
UNIVA_SERVER_HOST=127.0.0.1 AUTH_ENABLED=false python -m univa.univa_server
```

## 开发检查

安装好依赖后，依次运行 `bun run lint`、`bun run check-types` 和 `bun run build:local`，检查代码格式、工作区类型和本地生产构建，不调用媒体供应商。

提交前可运行 `bun run check:repo` 做快速扫描。本机密钥、MCP 配置、缓存、日志和中间渲染文件已被忽略；请提交 `.env.example` 模板，并在各台机器上运行 `scripts/configure_mcp_servers.py` 生成 MCP 配置。公开演示保留在 `docs/assets/readme/` 中。
