import * as vscode from "vscode";
import { createStatusBar, checkShellIntegration, setEnabled } from "./statusBar";
import { registerTerminalWatcher } from "./terminalWatcher";
import { onErrorDetected } from "./errorReporter";
import { log } from "./utils";

let enabled = true;

export function activate(context: vscode.ExtensionContext) {
  log("Extension activating...");

  createStatusBar(context);
  checkShellIntegration();
  registerTerminalWatcher(context, () => enabled);

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

  context.subscriptions.push(
    shellIntegrationListener,
    newTerminalListener,
    toggleCmd,
    checkCmd,
    testCmd
  );

  log(`Extension activated. Open terminals: ${vscode.window.terminals.length}`);
}

export function deactivate() {}
