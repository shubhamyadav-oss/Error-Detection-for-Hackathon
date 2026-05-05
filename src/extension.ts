import * as vscode from "vscode";

interface DetectedError {
  raw: string;
  terminal: string;
  timestamp: Date;
  pattern: string;
}

// Buffer per terminal to accumulate multi-line output before scanning
const terminalBuffers = new Map<string, string>();

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

  // vscode.window.onDidWriteTerminalData fires on every chunk of terminal output
  const dataListener = vscode.window.onDidWriteTerminalData((event) => {
    if (!enabled) return;
    handleTerminalData(event.terminal, event.data);
  });

  context.subscriptions.push(toggleCmd, dataListener, statusBarItem);
}

function handleTerminalData(terminal: vscode.Terminal, data: string) {
  const key = terminal.name;

  // Strip ANSI escape codes so regex patterns match plain text
  const clean = stripAnsi(data);

  // Accumulate into a rolling buffer (keep last 2000 chars to avoid unbounded growth)
  const prev = terminalBuffers.get(key) ?? "";
  const buffer = (prev + clean).slice(-2000);
  terminalBuffers.set(key, buffer);

  const patterns = getPatterns();
  for (const raw of patterns) {
    const regex = new RegExp(raw, "i");
    const match = regex.exec(clean);
    if (match) {
      const detected: DetectedError = {
        raw: extractErrorBlock(buffer, match.index ?? 0),
        terminal: key,
        timestamp: new Date(),
        pattern: raw,
      };
      onErrorDetected(detected);
      break; // one notification per data chunk is enough
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

export function deactivate() {
  terminalBuffers.clear();
}
