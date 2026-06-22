# Bunshin

**Skip the terminal. Put Claude Code to work.**

Bunshin is a desktop app for Claude Code. Plug in any large-model API, point an
agent at your folder, and let it handle the everyday work — reading, writing, and
running things for you. No command line, no setup ceremony.

<p align="center">
  <a href="https://github.com/frankkk96/bunshin-desktop/releases/latest/download/Bunshin-macOS.dmg"><b>Download for macOS</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/frankkk96/bunshin-desktop/releases/latest/download/Bunshin-Windows-setup.exe"><b>Download for Windows</b></a>
</p>

> macOS · Windows · Free, bring your own API keys

---

## Everything Claude Code does. None of the terminal.

- **Scoped to your code.** Every agent lives in a project folder. An agent pairs a
  working directory with a base URL, API key, and model. It reads, writes, and runs
  code right there — and every session and its history stay with that agent.

- **Bring your own model.** Run Claude through `api.anthropic.com`, or point an agent
  at any Anthropic-compatible endpoint — DeepSeek, Qwen, GLM, MiniMax, Kimi. Your
  keys, billed directly to you, no proxy in between.

- **Tools, with guardrails.** Bash, Read, Write, Edit, web search and fetch, MCP
  servers, and sub-agents. Pick a permission mode — ask, accept edits, plan-only, or
  bypass — and set allow / deny / ask rules per tool.

## Your keys, your data, your machine

- **Local SQLite.** Conversations, agent configs, and credentials live in a SQLite
  file on your device. Nothing leaves your machine except the requests you send to
  providers you've chosen.
- **BYO API keys.** No Bunshin-hosted backend, no proxy in the middle. Calls go
  directly from your machine to the provider, billed to your account, on your terms.
- **Native & signed.** Built on Tauri. A real desktop app, not a browser tab.
  Code-signed builds for macOS and Windows, with auto-updates delivered through the
  official channel.

## FAQ

**What is Bunshin?**
A desktop app that puts Claude Code behind a clean UI — so you can let it do real
work without ever touching a terminal. Plug in a model's API, point an agent at a
folder, and start working.

**Do I need to know the command line?**
No. Bunshin runs Claude Code for you under the hood — no terminal, no CLI flags, no
config files to hand-edit. You set a working directory, a model, and permissions in
the app, then just chat.

**Which models can I use?**
Any model with an Anthropic-compatible API. Use Claude via `api.anthropic.com`, or
point an agent at DeepSeek, Qwen (Alibaba), GLM (Zhipu), MiniMax, Kimi (Moonshot),
and others by setting the base URL, API key, and model id.

**What can an agent actually do?**
Read, write, and edit files, run shell commands, search and fetch the web, plan
multi-step work, and hand off to sub-agents — all scoped to the working directory you
choose.

**How do permissions work?**
Each agent runs in a permission mode — Default (ask before risky actions), Accept
edits, Plan only, or Bypass — plus allow / deny / ask rules per tool. During a
session you approve or deny individual tool calls inline.

**Where does my data live?**
Locally, in a SQLite file on your machine. Conversations, agent configs, and
credentials never leave your device unless you explicitly send them to a provider
you've configured.

**Which platforms are supported?**
macOS (Apple Silicon and Intel, universal binary) and Windows. Updates are signed
and delivered through the official auto-update channel.

---

## Development

Bunshin is a [Tauri v2](https://tauri.app) app — a React + Vite + TypeScript
frontend with a Rust backend.

**Prerequisites:** Node.js (LTS) and the
[Rust toolchain](https://www.rust-lang.org/tools/install).

```bash
npm install        # install frontend dependencies
npm run tauri dev  # run the app in development
```

To produce a local production build:

```bash
npm run tauri build
```

## Releases

Releases are published from this repository by the
[`publish`](.github/workflows/publish.yml) GitHub Actions workflow, triggered by
pushing a `v*` tag (e.g. `v0.5.2`). The workflow builds signed and notarized macOS
and Windows artifacts, uploads them to the GitHub Release, and publishes a
`latest.json` manifest that powers the in-app auto-updater. The download links above
always resolve to the newest release.

## License

Free to use. Bring your own API keys.
