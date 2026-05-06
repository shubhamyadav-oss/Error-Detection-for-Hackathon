import * as vscode from "vscode";
import { DetectedError } from "./types";
      // Actions sec w/ 3 buttons for Search, Explain, No Match
      // button for secondary is subtler.. for No Match and Explain
       // Actions ; search is primary (filled) vs Explain + No Match are secondary (subtler)
       // clicking any button now reveals #results w/ spinning circle (Load) + relevant Label (e.g "Searching Slack & Notion.." etc)
       // spinner is pure css - no external assets, and #results stays hidden or visible once shown! 
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
  const time = error.timestamp.toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
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
    .divider {
      border: none;
      border-top: 1px solid var(--vscode-panel-border);
      margin: 24px 0;
    } 

    .actions-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 12px 0;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      padding: 6px 14px;
      font-size: 13px;
      font-family: var(--vscode-font-family);
      cursor: pointer;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    #results {
      display: none;
      margin-top: 24px;
    }
    .loading {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--vscode-panel-border);
      border-top-color: var(--vscode-button-background);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .results-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 12px 0;
    }
    .card {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      cursor: pointer;
      background: var(--vscode-editor-background);
      user-select: none;
    }
    .card-header:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .source-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .source-badge.slack {
      background: #2c783c;
      color: #fff;
    }
    .source-badge.notion {
      background: #2d2d2d;
      color: #fff;
    }
    .card-title {
      flex: 1;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .score-chip {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 10px;
      flex-shrink: 0;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .chevron {
      font-size: 10px;
      transition: transform 0.2s;
      flex-shrink: 0;
      opacity: 0.6;
    }
    .card.open .chevron {
      transform: rotate(90deg);
    }
    .card-body {
      display: none;
      padding: 12px 14px;
      border-top: 1px solid var(--vscode-panel-border);
      background: var(--vscode-textCodeBlock-background);
    }
    .card.open .card-body {
      display: block;
    }
    .card-summary {
      font-size: 13px;
      margin: 0 0 10px 0;
      line-height: 1.5;
    }
    .breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 10px;
    }
    .breakdown-tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .source-links {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .source-links a {
      font-size: 12px;
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
      word-break: break-all;
    }
    .source-links a:hover {
      text-decoration: underline;
    }
    .weak-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #5c4a00;
      color: #ffd866;
      border: 1px solid #a07800;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .weak-banner-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .no-match-panel {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 16px;
      background: var(--vscode-textCodeBlock-background);
    }
    .no-match-panel h3 {
      margin: 0 0 4px 0;
      font-size: 13px;
      font-weight: 600;
    }
    .no-match-panel .channel-link {
      font-size: 12px;
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
      display: block;
      margin-bottom: 14px;
    }
    .no-match-panel .channel-link:hover {
      text-decoration: underline;
    }
    .draft-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 6px 0;
    }
    .draft-message {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0 0 10px 0;
    }
    .copy-btn {
      font-size: 11px;
      padding: 4px 10px;
    }
    .explain-panel {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      overflow: hidden;
    }
    .explain-section {
      padding: 14px;
    }
    .explain-section + .explain-section {
      border-top: 1px solid var(--vscode-panel-border);
    }
    .explain-section-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 8px 0;
    }
    .explain-section p {
      font-size: 13px;
      margin: 0;
      line-height: 1.6;
    }
    .explain-section pre {
      margin: 0;
      font-size: 12px;
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
  <p class="actions-label">What do you want to do?</p>
  <div class="actions">
    <button id="btn-search" onclick="cycleSearchDemo()">Search Slack &amp; Notion</button>
    <button id="btn-explain" class="secondary" onclick="vscode.postMessage({ command: 'explain', errorText: errorText }); showExplainDemo()">Explain Error</button>
    <button id="btn-no-match" class="secondary" onclick="vscode.postMessage({ command: 'no_match', errorText: errorText }); showNoMatch()">No Match</button>
  </div>

  <div id="results"></div>

  <hr class="divider" />
  <p class="section-label">Output</p>
  <pre>${escapeHtml(error.raw)}</pre>

  <script>
    const vscode = acquireVsCodeApi();
    const errorText = ${JSON.stringify(error.raw)};

    window.addEventListener('message', function(event) {
      // Ready to receive results back from the extension host in Step 3
      const msg = event.data;
      console.log('[error-assistant] message from extension:', msg);
    });

    function showLoading(label) {
      const results = document.getElementById('results');
      results.style.display = 'block';
      results.innerHTML =
        '<div class="loading">' +
          '<div class="spinner"></div>' +
          '<span>' + label + '</span>' +
        '</div>';
    }

    const mockResults = [
      {
        source: 'slack',
        score: 0.92,
        title: 'NoMethodError on save! — payments flow',
        summary: 'Resolved by adding a nil check before calling save! on the UserAccount object. Fix shipped in PR #4421.',
        score_breakdown: ['exception match', 'resolved reply', 'positive reactions'],
        source_links: ['https://cleo.slack.com/archives/C123/p456']
      },
      {
        source: 'notion',
        score: 0.78,
        title: 'Payment service nil object errors',
        summary: 'Runbook covering nil object errors in the payments domain. Recommends checking object initialisation order.',
        score_breakdown: ['keyword density', 'domain match'],
        source_links: ['https://notion.so/cleo/payment-nil-errors']
      },
      {
        source: 'slack',
        score: 0.61,
        title: 'save! failing intermittently on UserAccount',
        summary: 'Thread discussing intermittent save! failures. Resolved after the pending database migration was applied.',
        score_breakdown: ['method match', 'recent'],
        source_links: ['https://cleo.slack.com/archives/C789/p012']
      }
    ];

    function renderCard(result, index) {
      const tags = result.score_breakdown
        .map(function(t) { return '<span class="breakdown-tag">' + t + '</span>'; })
        .join('');
      const links = result.source_links
        .map(function(l) { return '<a href="' + l + '">' + l + '</a>'; })
        .join('');
      return (
        '<div class="card" id="card-' + index + '">' +
          '<div class="card-header" onclick="toggleCard(' + index + ')">' +
            '<span class="source-badge ' + result.source + '">' + result.source + '</span>' +
            '<span class="card-title">' + result.title + '</span>' +
            '<span class="score-chip">' + Math.round(result.score * 100) + '%</span>' +
            '<span class="chevron">&#9654;</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<p class="card-summary">' + result.summary + '</p>' +
            '<div class="breakdown">' + tags + '</div>' +
            '<div class="source-links">' + links + '</div>' +
          '</div>' +
        '</div>'
      );
    }

    function toggleCard(index) {
      document.getElementById('card-' + index).classList.toggle('open');
    }

    function showResults(type) {
      const results = document.getElementById('results');
      results.style.display = 'block';
      const banner = type === 'weak'
        ? '<div class="weak-banner">' +
            '<span class="weak-banner-icon">&#9888;</span>' +
            '<span>Low confidence matches — these results may not be directly related to your error.</span>' +
          '</div>'
        : '';
      results.innerHTML =
        banner +
        '<p class="results-label">Top matches</p>' +
        mockResults.map(renderCard).join('');
    }

    var demoStates = ['strong', 'weak', 'no_match'];
    var demoIndex = 0;

    function cycleSearchDemo() {
      vscode.postMessage({ command: 'search', errorText: errorText });
      var state = demoStates[demoIndex % demoStates.length];
      demoIndex++;
      if (state === 'no_match') {
        showNoMatch();
      } else {
        showLoading('Searching Slack &amp; Notion...');
        setTimeout(function() { showResults(state); }, 800);
      }
    }

    var mockDraft = "Hey team, seeing a NoMethodError on save! in the payments flow.\n\nError: NoMethodError: undefined method ‘save!’ for nil:NilClass\n\nHas anyone run into this before? Any pointers appreciated 🙏";

    function showNoMatch() {
      const results = document.getElementById('results');
      results.style.display = 'block';
      results.innerHTML =
        '<p class="results-label">No match found</p>' +
        '<div class="no-match-panel">' +
          '<h3>Suggested channel</h3>' +
          '<a class="channel-link" href="https://cleo.slack.com/channels/payments-incidents">#payments-incidents</a>' +
          '<p class="draft-label">Pre-drafted message</p>' +
          '<div class="draft-message" id="draft-text">' + mockDraft + '</div>' +
          '<button class="secondary copy-btn" onclick="copyDraft()">Copy message</button>' +
        '</div>';
    }

    function copyDraft() {
      const text = document.getElementById('draft-text').innerText;
      navigator.clipboard.writeText(text);
    }

    function showExplainDemo() {
      showLoading('Asking AI to explain...');
      setTimeout(function() {
        const results = document.getElementById('results');
        results.style.display = 'block';
        results.innerHTML =
          '<p class="results-label">Explanation</p>' +
          '<div class="explain-panel">' +
            '<div class="explain-section">' +
              '<p class="explain-section-label">What happened</p>' +
              '<p>This error occurs when you call a method (<code>save!</code>) on a <code>nil</code> object. In Ruby, <code>nil:NilClass</code> is the null type — calling any method on it raises <code>NoMethodError</code>. This typically means the object was never initialised, or a database query returned <code>nil</code> instead of a record.</p>' +
            '</div>' +
            '<div class="explain-section">' +
              '<p class="explain-section-label">Suggested fix</p>' +
              '<pre>// Add a nil check before calling save!\nif user_account\n  user_account.save!\nelse\n  Rails.logger.warn "UserAccount not found"\nend\n\n// Or use the safe navigation operator\nuser_account&.save!</pre>' +
            '</div>' +
          '</div>';
      }, 900);
    }
  </script>
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
