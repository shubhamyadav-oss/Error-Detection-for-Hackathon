import * as vscode from "vscode";

export function getPatterns(): string[] {
  return vscode.workspace
    .getConfiguration("cleoErrorDetective")
    .get<string[]>("patterns", []);
}
