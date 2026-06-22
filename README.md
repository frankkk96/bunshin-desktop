# Bunshin

**Skip the terminal. Put Claude Code to work.**

A desktop app for Claude Code — plug in any Anthropic-compatible API, point an agent
at a folder, and let it work. No command line, no setup ceremony.

[**Download for macOS**](https://github.com/frankkk96/bunshin-desktop/releases/latest/download/Bunshin-macOS.dmg) · [**Download for Windows**](https://github.com/frankkk96/bunshin-desktop/releases/latest/download/Bunshin-Windows-setup.exe) — free, bring your own API keys

## Features

- **Scoped to your code** — every agent pairs a working directory with a model.
- **Bring your own model** — Claude, DeepSeek, Qwen, GLM, MiniMax, Kimi, billed to you.
- **Tools with guardrails** — Bash, Edit, web, MCP, sub-agents, with permission modes.
- **Local-first** — conversations, configs, and keys live in a local SQLite file.

## Development

Built on [Tauri v2](https://tauri.app) (React + Vite + Rust). Requires Node.js (LTS)
and the Rust toolchain.

```bash
npm install        # install dependencies
npm run tauri dev  # run in development
npm run tauri build  # production build
```

## Releases

Pushing a `v*` tag runs the [`publish`](.github/workflows/publish.yml) workflow, which
builds signed macOS and Windows artifacts and a `latest.json` manifest for the in-app
auto-updater. The download links above always resolve to the newest release.
