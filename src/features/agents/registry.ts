import { ENSURE_NEOVIM_PS } from "../editors/windowsNeovim";
import claudeIcon from "../../assets/agents/claudecode-color.svg";
import codexIcon from "../../assets/agents/codex-color.svg";
import geminiIcon from "../../assets/agents/geminicli-color.svg";
import grokIcon from "../../assets/agents/grok.svg";
import opencodeIcon from "../../assets/agents/opencode.svg";
import cursorIcon from "../../assets/agents/cursor.svg";
import copilotIcon from "../../assets/agents/githubcopilot.svg";
import ampIcon from "../../assets/agents/amp.svg";
import qwenIcon from "../../assets/agents/qwen-color.svg";
import gooseIcon from "../../assets/agents/goose.svg";
import clineIcon from "../../assets/agents/cline.svg";
import vimIcon from "../../assets/agents/vim.svg";
import neovimIcon from "../../assets/agents/neovim.svg";

/**
 * Declarative agent integrations. Launch, install and resume behaviour all come
 * from here — components never hardcode agent specifics.
 */
export interface AgentDefinition {
  kind: string;
  displayName: string;
  vendor: string;
  executable: string;
  defaultArgs: string[];
  /** Args that continue the most recent conversation in the cwd, used when restoring after restart. */
  resumeArgs?: string[];
  /** Args to reopen one specific past conversation (see list_agent_chats in Rust). */
  resumeChatArgs?: (chatId: string) => string[];
  env: Record<string, string>;
  icon: string;
  /** Monochrome (currentColor) icons are inverted to render white. */
  mono?: boolean;
  install: { unix?: string; windows?: string };
  /** Editors (Vim family) share the session machinery but are listed and treated separately. */
  category?: "agent" | "editor";
  docsUrl: string;
}

const npm = (pkg: string) => ({ unix: `npm install -g ${pkg}`, windows: `npm install -g ${pkg}` });

export const agentList: AgentDefinition[] = [
  { kind: "claude-code", displayName: "Claude Code", vendor: "Anthropic", executable: "claude", defaultArgs: [], resumeArgs: ["--continue"], resumeChatArgs: (id) => ["--resume", id], env: {}, icon: claudeIcon, install: npm("@anthropic-ai/claude-code"), docsUrl: "https://docs.anthropic.com/en/docs/claude-code" },
  { kind: "codex", displayName: "Codex", vendor: "OpenAI", executable: "codex", defaultArgs: [], resumeArgs: ["resume", "--last"], resumeChatArgs: (id) => ["resume", id], env: {}, icon: codexIcon, install: npm("@openai/codex"), docsUrl: "https://github.com/openai/codex" },
  { kind: "gemini", displayName: "Gemini CLI", vendor: "Google", executable: "gemini", defaultArgs: [], env: {}, icon: geminiIcon, install: npm("@google/gemini-cli"), docsUrl: "https://github.com/google-gemini/gemini-cli" },
  { kind: "grok", displayName: "Grok CLI", vendor: "xAI · community", executable: "grok", defaultArgs: [], env: {}, icon: grokIcon, mono: true, install: npm("@vibe-kit/grok-cli"), docsUrl: "https://github.com/superagent-ai/grok-cli" },
  { kind: "opencode", displayName: "OpenCode", vendor: "SST", executable: "opencode", defaultArgs: [], resumeArgs: ["--continue"], env: {}, icon: opencodeIcon, mono: true, install: npm("opencode-ai"), docsUrl: "https://opencode.ai" },
  { kind: "cursor", displayName: "Cursor Agent", vendor: "Anysphere", executable: "cursor-agent", defaultArgs: [], resumeArgs: ["resume"], env: {}, icon: cursorIcon, mono: true, install: { unix: "curl https://cursor.com/install -fsS | bash" }, docsUrl: "https://cursor.com/cli" },
  { kind: "copilot", displayName: "Copilot CLI", vendor: "GitHub", executable: "copilot", defaultArgs: [], resumeArgs: ["--continue"], env: {}, icon: copilotIcon, mono: true, install: npm("@github/copilot"), docsUrl: "https://github.com/github/copilot-cli" },
  { kind: "amp", displayName: "Amp", vendor: "Sourcegraph", executable: "amp", defaultArgs: [], env: {}, icon: ampIcon, mono: true, install: npm("@sourcegraph/amp"), docsUrl: "https://ampcode.com" },
  { kind: "qwen", displayName: "Qwen Code", vendor: "Alibaba", executable: "qwen", defaultArgs: [], env: {}, icon: qwenIcon, install: npm("@qwen-code/qwen-code"), docsUrl: "https://github.com/QwenLM/qwen-code" },
  { kind: "goose", displayName: "Goose", vendor: "Block", executable: "goose", defaultArgs: [], env: {}, icon: gooseIcon, mono: true, install: { unix: "curl -fsSL https://github.com/block/goose/releases/download/stable/download_cli.sh | bash" }, docsUrl: "https://block.github.io/goose" },
  { kind: "cline", displayName: "Cline CLI", vendor: "Cline", executable: "cline", defaultArgs: [], env: {}, icon: clineIcon, mono: true, install: npm("cline"), docsUrl: "https://cline.bot" },
];


const editor = (kind: string, displayName: string, executable: string, icon: string, install: AgentDefinition["install"], docsUrl: string): AgentDefinition => ({
  kind, displayName, vendor: "Editor", executable, defaultArgs: [], env: {}, icon, install, docsUrl, category: "editor",
});

/** Terminal editors, opened in center tabs. `diff` runs `git difftool` with the Vim diff tool. */
export const editorList: AgentDefinition[] = [
  editor("nvim", "Neovim", "nvim", neovimIcon, { unix: "brew install neovim", windows: ENSURE_NEOVIM_PS }, "https://neovim.io"),
  editor("vim", "Vim", "vim", vimIcon, { unix: "brew install vim", windows: "winget install vim.vim" }, "https://www.vim.org"),
  editor("vi", "vi", "vi", vimIcon, {}, "https://www.vim.org"),
  editor("diff", "vimdiff", "git", vimIcon, {}, "https://git-scm.com/docs/git-difftool"),
];

export const AGENTS: Record<string, AgentDefinition> = Object.fromEntries([...agentList, ...editorList].map((a) => [a.kind, a]));
export const isEditor = (kind: string) => AGENTS[kind]?.category === "editor";
export type KnownAgentKind = string;
