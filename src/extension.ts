import * as vscode from "vscode";

interface DetectedError {
  raw: string;
  terminal: string;
  timestamp: Date;
  pattern: string;
}

let statusBarItem: vscode.StatusBarItem;
let enabled = true;

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "cleoErrorDetective.toggle";
  updateStatusBar();
  statusBarItem.show();

  const toggleCmd = vscode.commands.registerCommand(
    "cleoErrorDetective.toggle",
    () => {
      enabled = !enabled;
      updateStatusBar();
      vscode.window.showInformationMessage(
        `Cleo Error Detective: ${enabled ? "enabled" : "disabled"}`
      );
    }
  );

  // onDidEndTerminalShellExecution fires after each command completes (VS Code 1.93+).
  // event.execution.read() streams the full output of that command.
  const execListener = vscode.window.onDidEndTerminalShellExecution((event) => {
    if (!enabled) return;
    handleShellExecution(event.terminal, event.execution);
  });

  context.subscriptions.push(toggleCmd, execListener, statusBarItem);
}

async function handleShellExecution(
  terminal: vscode.Terminal,
  execution: vscode.TerminalShellExecution
) {
  let output = "";
  for await (const chunk of execution.read()) {
    output += chunk;
  }

  const clean = stripAnsi(output);
  const patterns = getPatterns();

  for (const raw of patterns) {
    const regex = new RegExp(raw, "i");
    const match = regex.exec(clean);
    if (match) {
      const detected: DetectedError = {
        raw: extractErrorBlock(clean, match.index),
        terminal: terminal.name,
        timestamp: new Date(),
        pattern: raw,
      };
      onErrorDetected(detected);
      break; // one notification per command is enough
    }
  }
}

function onErrorDetected(error: DetectedError) {
  // TODO: wire this up to Slack/Notion search in future steps
  console.log("[CleoErrorDetective] Detected error:", error);

  vscode.window
    .showErrorMessage(
      `Error detected in terminal "${error.terminal}": ${truncate(
        error.raw,
        120
      )}`,
      "Show Full Error"
    )
    .then((choice) => {
      if (choice === "Show Full Error") {
        showErrorDocument(error);
      }
    });
}

function showErrorDocument(error: DetectedError) {
  const content = [
    `Terminal : ${error.terminal}`,
    `Detected : ${error.timestamp.toISOString()}`,
    `Pattern  : ${error.pattern}`,
    ``,
    `--- Error Output ---`,
    error.raw,
  ].join("\n");

  vscode.workspace
    .openTextDocument({ content, language: "plaintext" })
    .then((doc) => vscode.window.showTextDocument(doc));
}

// Pull a meaningful block of text around the match (up to 5 lines before, rest of line)
function extractErrorBlock(buffer: string, matchIndex: number): string {
  const lines = buffer.split("\n");
  const charCount = buffer.slice(0, matchIndex).split("\n").length - 1;
  const start = Math.max(0, charCount - 5);
  return lines.slice(start, charCount + 10).join("\n").trim();
}

function getPatterns(): string[] {
  return vscode.workspace
    .getConfiguration("cleoErrorDetective")
    .get<string[]>("patterns", []);
}

function updateStatusBar() {
  statusBarItem.text = enabled
    ? "$(bug) Cleo Errors: ON"
    : "$(bug) Cleo Errors: OFF";
  statusBarItem.tooltip = "Click to toggle Cleo Error Detection";
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// Minimal ANSI escape code stripper
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
}

export function deactivate() {}
