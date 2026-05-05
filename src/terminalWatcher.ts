import * as vscode from "vscode";
import { DetectedError } from "./types";
import { stripAnsi, extractErrorBlock, getPatterns, log } from "./utils";
import { onErrorDetected } from "./errorReporter";

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
  let output = "";

  for await (const chunk of execution.read()) {
    output += chunk;
  }

  log(`Output captured from "${terminalName}" (${output.length} chars)`);

  const clean = stripAnsi(output);
  const patterns = getPatterns();
  log(`Scanning against ${patterns.length} patterns...`);

  let matched = false;
  for (const raw of patterns) {
    const regex = new RegExp(raw, "i");
    const match = regex.exec(clean);
    if (match) {
      log(`Pattern matched: "${raw}" at index ${match.index}`);
      const detected: DetectedError = {
        raw: extractErrorBlock(clean, match.index),
        terminal: terminalName,
        timestamp: new Date(),
        pattern: raw,
      };
      onErrorDetected(detected);
      matched = true;
      break;
    }
  }

  if (!matched) {
    log(`No error patterns matched for terminal "${terminalName}"`);
  }
}
