import * as vscode from "vscode";
import { DetectedError } from "./types";
import { getWebviewStyles } from "./webview/styles";
import { getWebviewScript } from "./webview/script";
import { apiClient, ApiError } from "./apiClient";

let panel: vscode.WebviewPanel | undefined;

function postApiError(err: unknown) {
  const kind = err instanceof ApiError ? err.kind : "unknown";
  const message = err instanceof Error ? err.message : "Unknown error";
  panel?.webview.postMessage({ command: "apiError", kind, message });
}

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

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case "search":
        try {
          const result = await apiClient.search({ error: message.error });
          if (result.match_status === "weak_match") {
            try {
              const weak = await apiClient.weakMatch({ error: message.error, results: result.results as any });
              panel?.webview.postMessage({ command: "searchResult", data: result, weak });
            } catch (err) {
              panel?.webview.postMessage({ command: "searchResult", data: result });
            }
          } else if (result.match_status === "no_match") {
            try {
              const noMatch = await apiClient.noMatch({ error: message.error });
              panel?.webview.postMessage({ command: "searchResult", data: result, noMatch });
            } catch (err) {
              panel?.webview.postMessage({ command: "searchResult", data: result });
            }
          } else {
            panel?.webview.postMessage({ command: "searchResult", data: result });
          }
        } catch (err) { postApiError(err); }
        break;

      case "explain":
        try {
          const result = await apiClient.explain({ error: message.error });
          panel?.webview.postMessage({ command: "explainResult", data: result });
        } catch (err) { postApiError(err); }
        break;

      case "no_match":
        try {
          const result = await apiClient.noMatch({ error: message.error });
          panel?.webview.postMessage({ command: "noMatchResult", data: result });
        } catch (err) { postApiError(err); }
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
