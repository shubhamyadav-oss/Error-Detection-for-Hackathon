import * as vscode from "vscode";
import { DetectedError } from "./types";
import { getWebviewStyles } from "./webview/styles";
import { getWebviewScript } from "./webview/script";

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
    { enableScripts: true }
  );

  panel.webview.html = buildHtml(error);
  panel.onDidDispose(() => { panel = undefined; });

  panel.webview.onDidReceiveMessage((message) => {
    // TODO: replace stubs with real HTTP calls to the backend
    switch (message.command) {
      case 'search':
        console.log('[error-assistant] search requested:', message.errorText?.slice(0, 80));
        break;
      case 'explain':
        console.log('[error-assistant] explain requested:', message.errorText?.slice(0, 80));
        break;
      case 'no_match':
        console.log('[error-assistant] no_match requested:', message.errorText?.slice(0, 80));
        break;
    }
  });
}

function buildHtml(error: DetectedError): string {
  const nonce = getNonce();
  const time = error.timestamp.toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Cleo Error Detail</title>
  <style>${getWebviewStyles()}</style>
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
  <p class="actions-label">What do you want to do?</p>
  <div class="actions">
    <button id="btn-search">Search Slack &amp; Notion</button>
    <button id="btn-explain" class="secondary">Explain Error</button>
    <button id="btn-no-match" class="secondary">No Match</button>
  </div>

  <div id="results"></div>

  <div id="__error-raw" style="display:none">${escapeHtml(error.raw)}</div>

  <hr class="divider" />
  <p class="section-label">Output</p>
  <pre>${escapeHtml(error.raw)}</pre>

  <script nonce="${nonce}">${getWebviewScript()}</script>
</body>
</html>`;
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
