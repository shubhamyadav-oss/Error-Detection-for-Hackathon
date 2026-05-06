import * as vscode from "vscode";
import { DetectedError } from "./types";

let panel: vscode.WebviewPanel | undefined;

export function showErrorInWebview(error: DetectedError): void {
  if (panel) {
    panel.webview.html = buildHtml(error);
    panel.reveal();
    return;
  }

  panel = vscode.window.createWebviewPanel(
    "cleoErrorDetail",
    "Cleo: Error Detail",
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  panel.webview.html = buildHtml(error);
  panel.onDidDispose(() => { panel = undefined; });
}

function buildHtml(error: DetectedError): string {
  const time = error.timestamp.toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <title>Cleo Error Detail</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      margin: 0;
      line-height: 1.5;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    h1 { font-size: 18px; margin: 0; }
    .badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .meta {
      display: flex;
      gap: 32px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      padding-bottom: 20px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .meta-item { display: flex; flex-direction: column; gap: 3px; }
    .meta-label {
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.06em;
      opacity: 0.65;
    }
    .meta-value { font-weight: 500; color: var(--vscode-foreground); }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 8px 0;
    }
    pre {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 16px;
      margin: 0;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <header>
    <span class="badge">${escapeHtml(error.pattern)}</span>
    <h1>Error Detected</h1>
  </header>
  <div class="meta">
    <div class="meta-item">
      <span class="meta-label">Terminal</span>
      <span class="meta-value">${escapeHtml(error.terminal)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Detected</span>
      <span class="meta-value">${escapeHtml(time)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Pattern</span>
      <span class="meta-value">${escapeHtml(error.pattern)}</span>
    </div>
  </div>
  <p class="section-label">Output</p>
  <pre>${escapeHtml(error.raw)}</pre>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
