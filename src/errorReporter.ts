import * as vscode from "vscode";
import { DetectedError } from "./types";
import { truncate, log } from "./utils";

export function onErrorDetected(error: DetectedError): void {
  log(`Error detected — terminal: "${error.terminal}", pattern: "${error.pattern}"`);

  vscode.window
    .showErrorMessage(
      `Error detected in terminal "${error.terminal}": ${truncate(error.raw, 120)}`,
      "Show Full Error"
    )
    .then((choice) => {
      if (choice === "Show Full Error") {
        showErrorDocument(error);
      }
    });
}

function showErrorDocument(error: DetectedError): void {
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
