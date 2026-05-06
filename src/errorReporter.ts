import * as vscode from "vscode";
import { DetectedError } from "./types";
import { truncate, log } from "./utils";
import { errorHistoryProvider } from "./errorHistoryProvider";
import { showErrorInWebview } from "./errorWebview";

export function onErrorDetected(error: DetectedError): void {
  log(`Error detected — terminal: "${error.terminal}", pattern: "${error.pattern}"`);
  errorHistoryProvider.add(error);

  vscode.window
    .showErrorMessage(
      `Error detected in terminal "${error.terminal}": ${truncate(error.raw, 120)}`,
      "Show Full Error"
    )
    .then((choice) => {
      if (choice === "Show Full Error") {
        showErrorInWebview(error);
      }
    });
}
