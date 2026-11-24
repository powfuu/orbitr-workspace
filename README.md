# Orbitr Workspace

> Your agents. Your terminals. One workspace.

Terminal-first desktop workspace for AI coding agents. Tauri 2 · Rust · React · TypeScript · Tailwind v4 · Zustand · Framer Motion.

## Prerequisites

- Node 20+
- Rust stable (`rustup default stable`). With Homebrew's rustup, add it to PATH:
  `export PATH="$(brew --prefix rustup)/bin:$PATH"`
- macOS: Xcode Command Line Tools · Windows: WebView2 + MSVC build tools

## Run

```bash
npm install
npm run tauri dev      # native desktop app (Vite on :1420 + Rust)
npm run dev            # frontend only, in a browser (no native APIs)
npm run typecheck
npm run tauri build    # release bundle
```

## Shortcuts (⌘ on macOS, Ctrl on Windows)

| Keys | Action |
|---|---|
| Mod+K | Command palette |
| Mod+B | Toggle sidebar |
| Mod+J | Toggle terminal panel |
| Mod+T | New terminal |
| Mod+1…9 | Switch workspace |
| Mod+N | Start agent |
| Mod+, | Settings |
| Ctrl+Tab / Mod+Shift+[ ] | Cycle tabs |
| Mod+\\ / Mod+Shift+\\ | Split pane right / down |
| Mod+Shift+V | Voice input |
| Cmd+F (macOS) / Ctrl+Shift+F | Find in terminal or agent output |
| Mod+Shift+L | Toggle agent timeline |
| Mod+W | Close tab |

## Layout

```
src/
  app/            App root
  components/     layout · sidebar · tabs · workspace · terminal · palette · ui
  features/       agents (registry) · projects · tabs · commands
  stores/         layout · workspace · tabs · sessions (Zustand)
  hooks/ lib/ types/ styles/
src-tauri/src/
  commands/       Tauri commands (system::platform_info)
```

## Status

| Phase | State |
|---|---|
| 1 Visual foundation | ✅ shell, sidebar, tabs, resizable/collapsible panels, palette, persistence of layout/workspaces/projects |
| 2 Terminal engine (xterm.js + portable-pty) | ✅ real shells, multi-session, resize, kill, restart |
| 3 Agents (Claude Code, Codex) | ✅ launched via login shell in PTY, start/stop/restart, install detection |
| 4 Workspace management | ✅ file-backed persistence, per-workspace tabs, session restore with scrollback, chat history + resume, live agent activity |
| 5 Polish | ✅ settings, toasts, error boundaries, native notifications, WebGL terminals, Cmd-click links, more shortcuts |

Session/process state (`stores/sessionStore.ts`) is deliberately not persisted — OS processes don't survive restarts; agent tabs are dropped on restore.

Rust tests: `cd src-tauri && cargo test`
