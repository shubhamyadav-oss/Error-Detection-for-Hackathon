import * as vscode from "vscode";
import { createStatusBar, checkShellIntegration, setEnabled, showShellIntegrationStatus } from "./statusBar";
import { registerTerminalWatcher } from "./terminalWatcher";
import { onErrorDetected } from "./errorReporter";
import { errorHistoryProvider } from "./errorHistoryProvider";
import { showErrorInWebview } from "./errorWebview";
import { log } from "./utils";

let enabled = true;

export function activate(context: vscode.ExtensionContext) {
  log("Extension activating...");

  createStatusBar(context);
  checkShellIntegration();
  registerTerminalWatcher(context, () => enabled);

  vscode.window.registerTreeDataProvider("cleoErrorHistory", errorHistoryProvider);

  const shellIntegrationListener = vscode.window.onDidChangeTerminalShellIntegration((event) => {
    log(`Shell integration changed for terminal: "${event.terminal.name}"`);
    checkShellIntegration();
  });

  const newTerminalListener = vscode.window.onDidOpenTerminal((terminal) => {
    log(`New terminal opened: "${terminal.name}" — shell integration: ${terminal.shellIntegration ? "active" : "not yet active"}`);
    checkShellIntegration();
  });

  const toggleCmd = vscode.commands.registerCommand(
    "cleoErrorDetective.toggle",
    () => {
      enabled = !enabled;
      setEnabled(enabled);
      log(`Detection toggled: ${enabled ? "ON" : "OFF"}`);
      vscode.window.showInformationMessage(
        `Cleo Error Detective: ${enabled ? "enabled" : "disabled"}`
      );
    }
  );

  const checkCmd = vscode.commands.registerCommand(
    "cleoErrorDetective.checkShellIntegration",
    showShellIntegrationStatus
  );

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

  const clearHistoryCmd = vscode.commands.registerCommand(
    "cleoErrorDetective.clearHistory",
    () => {
      errorHistoryProvider.clear();
      log("Error history cleared.");
    }
  );

  const showHistoryErrorCmd = vscode.commands.registerCommand(
    "cleoErrorDetective.showHistoryError",
    (error) => showErrorInWebview(error)
  );

  context.subscriptions.push(
    shellIntegrationListener,
    newTerminalListener,
    toggleCmd,
    checkCmd,
    testCmd,
    clearHistoryCmd,
    showHistoryErrorCmd
  );

  log(`Extension activated. Open terminals: ${vscode.window.terminals.length}`);
}

export function deactivate() {}
