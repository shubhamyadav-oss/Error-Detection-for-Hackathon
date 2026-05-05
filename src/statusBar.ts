import * as vscode from "vscode";
import { log } from "./utils";

let item: vscode.StatusBarItem;

// Both states live here so any caller can update one without knowing the other
let shellIntegrationActive = true;
let detectionEnabled = true;
let warningShown = false;

export function createStatusBar(context: vscode.ExtensionContext): void {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = "cleoErrorDetective.toggle";
  item.show();
  context.subscriptions.push(item);
}

export function setEnabled(value: boolean): void {
  detectionEnabled = value;
  refresh();
}

export function checkShellIntegration(): void {
  const hasIntegration = vscode.window.terminals.some(
    (t) => t.shellIntegration !== undefined
  );

  if (!hasIntegration && !warningShown) {
    warningShown = true;
    vscode.window
      .showWarningMessage(
        "Cleo Error Detective: Shell integration is not active. Open a new terminal or enable it via Settings > Terminal > Shell Integration.",
        "Open Settings"
      )
      .then((choice) => {
        if (choice === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "terminal.integrated.shellIntegration.enabled"
          );
        }
      });
  }

  shellIntegrationActive = hasIntegration;
  if (hasIntegration) {
    warningShown = false;
  }
  refresh();
}

function refresh(): void {
  if (!detectionEnabled) {
    item.text = "$(bug) Cleo Errors: OFF";
    item.tooltip = "Click to enable Cleo Error Detection";
    item.backgroundColor = undefined;
  } else if (!shellIntegrationActive) {
    item.text = "$(warning) Cleo Errors: No Shell Integration";
    item.tooltip = "Shell integration is inactive — open a new terminal to activate error detection";
    item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  } else {
    item.text = "$(bug) Cleo Errors: ON";
    item.tooltip = "Click to toggle Cleo Error Detection";
    item.backgroundColor = undefined;
  }
  log(`Status bar updated: ${item.text}`);
}
