import * as vscode from "vscode";
import { DetectedError } from "./types";
import { stripAnsi, extractErrorBlock, getPatterns, log } from "./utils";
import { onErrorDetected } from "./errorReporter";

// Per-terminal cooldown: suppress repeat alerts within this window (ms).
// Prevents a foreman-style cascade (4 processes failing at once) from firing 4 notifications.
const COOLDOWN_MS = 10_000;
const lastAlertAt = new Map<string, number>();

export function registerTerminalWatcher(
  context: vscode.ExtensionContext,
  isEnabled: () => boolean
): void {
  // execution.read() is a live stream — must be consumed during onDidStart, not onDidEnd.
  // By the time onDidEnd fires the stream is already closed and returns 0 bytes.
  const listener = vscode.window.onDidStartTerminalShellExecution((event) => {
    log(`onDidStartTerminalShellExecution fired for terminal: "${event.terminal.name}"`);
    if (!isEnabled()) {
      log("Detection is disabled — skipping.");
      return;
    }
    handleShellExecution(event.terminal, event.execution);
  });

  context.subscriptions.push(listener);
}

async function handleShellExecution(
  terminal: vscode.Terminal,
  execution: vscode.TerminalShellExecution
): Promise<void> {
  // Capture the terminal name immediately — it may change while awaiting (VS Code renames
  // the tab to the running process name mid-execution)
  const terminalName = terminal.name;

  // Scan chunks as they arrive so long-running processes (foreman, rails server, sidekiq)
  // are monitored in real-time rather than only after they exit.
  //
  // tail holds a sliding window of recent raw output. It grows with each chunk and is
  // trimmed back to TAIL_KEEP_CHARS whenever it exceeds TAIL_MAX_CHARS, ensuring patterns
  // that straddle chunk boundaries are still matched while keeping memory bounded.
  const TAIL_MAX_CHARS = 10_000;
  const TAIL_KEEP_CHARS = 5_000;
  let tail = "";

  for await (const chunk of execution.read()) {
    tail += chunk;

    // Scan BEFORE trimming: if a large chunk arrives all at once (e.g. foreman with 4 processes
    // dying simultaneously the entire output lands in one chunk), trimming first would discard
    // the early lines containing the first error occurrence, leaving only the tail of the last
    // process's stack trace to scan against.
    const clean = stripAnsi(tail);
    const patterns = getPatterns();

    for (const raw of patterns) {
      const regex = new RegExp(raw, "i");
      const match = regex.exec(clean);
      if (match) {
        const now = Date.now();
        const last = lastAlertAt.get(terminalName) ?? 0;
        if (now - last < COOLDOWN_MS) {
          log(`Pattern matched "${raw}" in "${terminalName}" but suppressed (cooldown)`);
          tail = "";
          break;
        }

        log(`Pattern matched: "${raw}" at index ${match.index}`);
        lastAlertAt.set(terminalName, now);
        const detected: DetectedError = {
          raw: extractErrorBlock(clean, match.index),
          terminal: terminalName,
          timestamp: new Date(),
          pattern: raw,
        };
        onErrorDetected(detected);
        // Clear tail after reporting so the same error block isn't re-matched on the next chunk
        tail = "";
        break;
      }
    }

    // Trim after scanning to bound memory for long-running processes that produce continuous output
    if (tail.length > TAIL_MAX_CHARS) {
      tail = tail.slice(-TAIL_KEEP_CHARS);
    }
  }

  log(`Stream ended for "${terminalName}"`);
}
