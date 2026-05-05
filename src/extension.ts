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
  log("Extension activating...");

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "cleoErrorDetective.toggle";
  updateStatusBar(true);
  statusBarItem.show();
  checkShellIntegration();

  const toggleCmd = vscode.commands.registerCommand(
    "cleoErrorDetective.toggle",
    () => {
      enabled = !enabled;
      updateStatusBar();
      log(`Detection toggled: ${enabled ? "ON" : "OFF"}`);
      vscode.window.showInformationMessage(
        `Cleo Error Detective: ${enabled ? "enabled" : "disabled"}`
      );
    }
  );

  // Prints the shell integration status of every open terminal to the Debug Console.
  const checkCmd = vscode.commands.registerCommand(
    "cleoErrorDetective.checkShellIntegration",
    () => {
      const terminals = vscode.window.terminals;
      if (terminals.length === 0) {
        log("No open terminals found.");
        vscode.window.showWarningMessage("Cleo: No open terminals found.");
        return;
      }
      const lines = terminals.map((t) => {
        const status = t.shellIntegration ? "✅ shell integration active" : "❌ no shell integration";
        return `  "${t.name}": ${status}`;
      });
      const report = ["Shell integration status:", ...lines].join("\n");
      log(report);
      vscode.window.showInformationMessage(report, { modal: true });
    }
  );

  // Fires a fake error through the full detection pipeline to verify notifications work.
  const testCmd = vscode.commands.registerCommand(
    "cleoErrorDetective.testDetection",
    () => {
      log("Firing fake error through detection pipeline...");
      onErrorDetected({
        raw: "TypeError: Cannot read properties of undefined (reading 'map')\n    at Object.<anonymous> (test.ts:10:5)",
        terminal: "test",
        timestamp: new Date(),
        pattern: "TypeError:",
      });
    }
  );

  // execution.read() is a live stream — it must be consumed during onDidStartTerminalShellExecution.
  // By the time onDidEnd fires the stream is already closed and returns 0 bytes.
  const execListener = vscode.window.onDidStartTerminalShellExecution((event) => {
    log(`onDidStartTerminalShellExecution fired for terminal: "${event.terminal.name}"`);
    if (!enabled) {
      log("Detection is disabled — skipping.");
      return;
    }
    handleShellExecution(event.terminal, event.execution);
  });

  // Warn on startup if existing terminals don't have shell integration active.
  // Without it, onDidEndTerminalShellExecution never fires and detection is silently broken.
  const shellIntegrationListener = vscode.window.onDidChangeTerminalShellIntegration((event) => {
    log(`Shell integration changed for terminal: "${event.terminal.name}"`);
    checkShellIntegration();
  });

  const newTerminalListener = vscode.window.onDidOpenTerminal((terminal) => {
    log(`New terminal opened: "${terminal.name}" — shell integration: ${terminal.shellIntegration ? "active" : "not yet active"}`);
    checkShellIntegration();
  });

  context.subscriptions.push(
    toggleCmd,
    checkCmd,
    testCmd,
    execListener,
    shellIntegrationListener,
    newTerminalListener,
    statusBarItem
  );

  log(`Extension activated. Open terminals: ${vscode.window.terminals.length}`);
}

async function handleShellExecution(
  terminal: vscode.Terminal,
  execution: vscode.TerminalShellExecution
) {
  let output = "";
  for await (const chunk of execution.read()) {
    output += chunk;
  }

  log(`Output captured from "${terminal.name}" (${output.length} chars)`);

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
        terminal: terminal.name,
        timestamp: new Date(),
        pattern: raw,
      };
      onErrorDetected(detected);
      matched = true;
      break; // one notification per command is enough
    }
  }

  if (!matched) {
    log(`No error patterns matched for terminal "${terminal.name}"`);
  }
}

function onErrorDetected(error: DetectedError) {
  log(`Error detected — terminal: "${error.terminal}", pattern: "${error.pattern}"`);

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

let shellIntegrationWarningShown = false;

function checkShellIntegration() {
  const hasIntegration = vscode.window.terminals.some(
    (t) => t.shellIntegration !== undefined
  );

  if (!hasIntegration && !shellIntegrationWarningShown) {
    shellIntegrationWarningShown = true;
    vscode.window.showWarningMessage(
      "Cleo Error Detective: Shell integration is not active. Open a new terminal or enable it via Settings > Terminal > Shell Integration.",
      "Open Settings"
    ).then((choice) => {
      if (choice === "Open Settings") {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "terminal.integrated.shellIntegration.enabled"
        );
      }
    });
    updateStatusBar(false);
  } else if (hasIntegration) {
    shellIntegrationWarningShown = false;
    updateStatusBar(true);
  }
}

function updateStatusBar(shellIntegrationActive?: boolean) {
  if (!enabled) {
    statusBarItem.text = "$(bug) Cleo Errors: OFF";
    statusBarItem.tooltip = "Click to enable Cleo Error Detection";
    statusBarItem.backgroundColor = undefined;
    return;
  }
  if (shellIntegrationActive === false) {
    statusBarItem.text = "$(warning) Cleo Errors: No Shell Integration";
    statusBarItem.tooltip =
      "Shell integration is inactive — open a new terminal to activate error detection";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  } else {
    statusBarItem.text = "$(bug) Cleo Errors: ON";
    statusBarItem.tooltip = "Click to toggle Cleo Error Detection";
    statusBarItem.backgroundColor = undefined;
  }
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function stripAnsi(s: string): string {
  return s
    // CSI sequences: ESC [ ... final-byte  (colours, cursor movement, etc.)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, "")
    // OSC sequences: ESC ] ... BEL  or  ESC ] ... ESC \  (shell integration markers, titles)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, "")
    .replace(/\r/g, "");
}

function log(message: string): void {
  console.log(`[CleoErrorDetective] ${message}`);
}

export function deactivate() {}
