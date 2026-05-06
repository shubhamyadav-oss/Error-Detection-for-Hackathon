export function getWebviewStyles(): string {
  return `
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
  `;
}
