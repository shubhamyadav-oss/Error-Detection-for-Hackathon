import * as vscode from "vscode";
import { DetectedError, ExecutionState } from "./types";
import { stripAnsi, extractErrorBlock, log } from "./utils";
import { getPatterns } from "./config";
import { onErrorDetected } from "./errorReporter";

const COOLDOWN_MS = 10_000;

class Cooldown {
  private readonly lastAt = new Map<string, number>();

  isSuppressed(key: string): boolean {
    return Date.now() - (this.lastAt.get(key) ?? 0) < COOLDOWN_MS;
  }

  record(key: string): void {
    this.lastAt.set(key, Date.now());
  }
}

const cooldown = new Cooldown();

// Executions that already fired a pattern-based alert — exit-code path skips these
// to avoid reporting the same failure twice.
const alertedExecutions = new WeakSet<vscode.TerminalShellExecution>();

// Output state per execution. An object reference so handleShellEnd always reads the
// latest tail even though handleShellExecution is still awaiting when end fires.
const executionStates = new WeakMap<vscode.TerminalShellExecution, ExecutionState>();

export function registerTerminalWatcher(
  context: vscode.ExtensionContext,
  isEnabled: () => boolean
): void {
  // Stream listener: pattern-based detection for long-running processes (foreman, rails server,
  // sidekiq) where exit code arrives too late to be useful mid-run.
  const startListener = vscode.window.onDidStartTerminalShellExecution((event) => {
    log(`onDidStartTerminalShellExecution fired for terminal: "${event.terminal.name}"`);
    if (!isEnabled()) {
      log("Detection is disabled — skipping.");
      return;
    }
    handleShellExecution(event.terminal, event.execution);
  });

  // Exit code listener: primary detector for short-lived commands (bundle install,
  // rails db:migrate, git push, npm install, etc.). Any non-zero exit means failure.
  const endListener = vscode.window.onDidEndTerminalShellExecution((event) => {
    if (!isEnabled()) return;
    handleShellEnd(event.execution, event.exitCode);
  });

  context.subscriptions.push(startListener, endListener);
}

async function handleShellExecution(
  terminal: vscode.Terminal,
  execution: vscode.TerminalShellExecution
): Promise<void> {
  // Capture terminal name immediately — VS Code renames the tab to the running process
  // mid-execution, so reading it later would give the wrong name.
  const terminalName = terminal.name;
  const TAIL_MAX_CHARS = 10_000;
  const TAIL_KEEP_CHARS = 5_000;

  const state: ExecutionState = { terminalName, tail: "" };
  executionStates.set(execution, state);

  for await (const chunk of execution.read()) {
    state.tail += chunk;

    // Scan BEFORE trimming: if a large chunk arrives all at once (e.g. foreman with 4
    // processes dying simultaneously), trimming first discards early lines containing
    // the first error occurrence.
    const clean = stripAnsi(state.tail);

    for (const raw of getPatterns()) {
      const match = new RegExp(raw, "i").exec(clean);
      if (!match) continue;

      if (cooldown.isSuppressed(terminalName)) {
        log(`Pattern matched "${raw}" in "${terminalName}" but suppressed (cooldown)`);
      } else {
        log(`Pattern matched: "${raw}" at index ${match.index}`);
        cooldown.record(terminalName);
        alertedExecutions.add(execution);
        onErrorDetected({
          raw: extractErrorBlock(clean, match.index),
          terminal: terminalName,
          timestamp: new Date(),
          pattern: raw,
        });
      }

      state.tail = "";
      break;
    }

    if (state.tail.length > TAIL_MAX_CHARS) {
      state.tail = state.tail.slice(-TAIL_KEEP_CHARS);
    }
  }

  log(`Stream ended for "${terminalName}"`);
}

function handleShellEnd(
  execution: vscode.TerminalShellExecution,
  exitCode: number | undefined
): void {
  if (exitCode === undefined || exitCode === 0) return;

  const state = executionStates.get(execution);
  const terminalName = state?.terminalName ?? "unknown";

  if (alertedExecutions.has(execution)) {
    log(`Exit code ${exitCode} in "${terminalName}" — already reported via pattern match, skipping`);
    return;
  }

  if (cooldown.isSuppressed(terminalName)) {
    log(`Exit code ${exitCode} in "${terminalName}" suppressed (cooldown)`);
    return;
  }

  log(`Exit code ${exitCode} detected for "${terminalName}"`);
  cooldown.record(terminalName);

  const raw = state?.tail ? stripAnsi(state.tail).trim() : "";

  // Try to pinpoint the most relevant line using patterns so the shown block is
  // focused rather than just a raw tail dump. Falls back to the last 30 lines.
  let errorBlock = "";
  if (raw) {
    for (const p of getPatterns()) {
      const match = new RegExp(p, "i").exec(raw);
      if (match) {
        errorBlock = extractErrorBlock(raw, match.index);
        break;
      }
    }
    if (!errorBlock) {
      errorBlock = raw.split("\n").filter((l) => l.trim()).slice(-30).join("\n");
    }
  }

  onErrorDetected({
    raw: errorBlock || `Command exited with code ${exitCode}`,
    terminal: terminalName,
    timestamp: new Date(),
    pattern: `exit code ${exitCode}`,
  });
}
