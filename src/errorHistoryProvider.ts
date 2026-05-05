import * as vscode from "vscode";
import { DetectedError } from "./types";

const MAX_HISTORY = 50;

class ErrorHistoryItem extends vscode.TreeItem {
  constructor(public readonly error: DetectedError) {
    super(error.pattern, vscode.TreeItemCollapsibleState.None);
    this.description = `${error.terminal} · ${formatRelativeTime(error.timestamp)}`;
    this.tooltip = new vscode.MarkdownString(
      `**${error.pattern}** in \`${error.terminal}\`\n\n\`\`\`\n${error.raw.slice(0, 300)}\n\`\`\``
    );
    this.iconPath = new vscode.ThemeIcon("error");
    this.command = {
      command: "cleoErrorDetective.showHistoryError",
      title: "Show Error",
      arguments: [error],
    };
  }
}

export class ErrorHistoryProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private history: DetectedError[] = [];

  add(error: DetectedError): void {
    this.history.unshift(error); // newest first
    if (this.history.length > MAX_HISTORY) {
      this.history.pop();
    }
    this._onDidChangeTreeData.fire();
  }

  clear(): void {
    this.history = [];
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    if (this.history.length === 0) {
      const placeholder = new vscode.TreeItem("No errors detected yet");
      placeholder.iconPath = new vscode.ThemeIcon("info");
      return [placeholder];
    }
    return this.history.map((error) => new ErrorHistoryItem(error));
  }
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) { return "just now"; }
  if (seconds < 3600) { return `${Math.floor(seconds / 60)}m ago`; }
  if (seconds < 86400) { return `${Math.floor(seconds / 3600)}h ago`; }
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Singleton shared between errorReporter and extension
export const errorHistoryProvider = new ErrorHistoryProvider();
