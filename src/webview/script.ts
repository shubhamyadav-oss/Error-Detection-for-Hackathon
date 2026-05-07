export function getWebviewScript(): string {
  return `
    const vscode = acquireVsCodeApi();
    const errorText = document.getElementById('__error-raw').textContent;
    console.log('[error-assistant] webview script initialized, errorText length:', errorText ? errorText.length : 0);

    // -- Button handlers ----------------------------------------------------

    document.getElementById('btn-search').addEventListener('click', function() {
      showLoading('Searching Slack & Notion...');
      vscode.postMessage({ command: 'search', error: errorText });
    });
    document.getElementById('btn-explain').addEventListener('click', function() {
      showLoading('Asking AI to explain...');
      vscode.postMessage({ command: 'explain', error: errorText });
    });
    document.getElementById('btn-no-match').addEventListener('click', function() {
      showLoading('Finding the best channel to ask...');
      vscode.postMessage({ command: 'no_match', error: errorText });
    });

    // Event delegation for dynamically rendered buttons (copy, card toggles)
    document.getElementById('results').addEventListener('click', function(event) {
      var target = event.target;
      if (target.classList.contains('copy-btn')) {
        var draft = document.getElementById('draft-text');
        if (draft) navigator.clipboard.writeText(draft.innerText);
        return;
      }
      var header = target.closest('.card-header');
      if (header) {
        var index = header.getAttribute('data-index');
        if (index !== null) toggleCard(parseInt(index, 10));
      }
    });

    // -- Message dispatcher (extension -> webview) --------------------------

    window.addEventListener('message', function(event) {
      const msg = event.data;
      console.log('[error-assistant] message from extension:', msg && msg.command);
      switch (msg && msg.command) {
        case 'searchResult':  return renderSearchResult(msg.data, msg.weak, msg.noMatch);
        case 'explainResult': return renderExplain(msg.data);
        case 'noMatchResult': return renderNoMatchResponse(msg.data);
        case 'apiError':      return renderError(msg.kind, msg.message);
      }
    });

    // -- Loading + error states --------------------------------------------

    function showLoading(label) {
      var el = document.getElementById('results');
      el.style.display = 'block';
      el.innerHTML =
        '<div class="loading">' +
          '<div class="spinner"></div>' +
          '<span>' + escapeText(label) + '</span>' +
        '</div>';
    }

    function renderError(kind, message) {
      var title = 'Something went wrong';
      var hint = '';
      if (kind === 'unauthorized') {
        title = 'Authentication required';
        hint = 'Set <code>cleoErrorDetective.apiToken</code> in your VS Code settings to match the backend\\'s <code>ERROR_ASSISTANT_SECRET</code>.';
      } else if (kind === 'network') {
        title = 'Could not reach the backend';
        hint = 'Check that the Rails app is running and that <code>cleoErrorDetective.apiBaseUrl</code> is correct.';
      } else if (kind === 'bad_gateway') {
        title = 'Upstream service failed';
        hint = 'The backend reached the AI provider but the call failed. Try again in a moment.';
      } else if (kind === 'validation') {
        title = 'Request was rejected';
      }
      var el = document.getElementById('results');
      el.style.display = 'block';
      el.innerHTML =
        '<div class="error-panel">' +
          '<p class="error-title">' + escapeText(title) + '</p>' +
          '<p class="error-message">' + escapeText(message || '') + '</p>' +
          (hint ? '<p class="error-hint">' + hint + '</p>' : '') +
        '</div>';
    }

    // -- Search result renderer --------------------------------------------

    function renderSearchResult(data, weak, noMatch) {
      var status = data && data.match_status;
      if (status === 'no_match' && noMatch) {
        return renderNoMatchResponse(noMatch);
      }
      var el = document.getElementById('results');
      el.style.display = 'block';
      var banner = '';
      if (status === 'weak_match') {
        var note = (weak && weak.note) ? weak.note : 'These results are below the confidence threshold and may not be directly related to your error.';
        banner =
          '<div class="weak-banner">' +
            '<span class="weak-banner-icon">&#9888;</span>' +
            '<span><strong>Low confidence matches</strong> &mdash; ' + escapeText(note) + '</span>' +
          '</div>';
      }
      var summaryLine = '';
      if (data && data.common_keywords && data.common_keywords.length > 0) {
        var badges = data.common_keywords
          .map(function(k) { return '<span class="theme-badge">' + escapeText(k) + '</span>'; })
          .join('');
        summaryLine =
          '<div class="themes-row">' +
            '<span class="themes-label">Common themes:</span>' +
            '<div class="theme-badges">' + badges + '</div>' +
          '</div>';
      }
      var HIGH_CONFIDENCE = 0.6;
      var allResults = (data && Array.isArray(data.results)) ? data.results : [];
      var displayed;
      if (status === 'strong_match') {
        var highConfidence = allResults.filter(function(r) { return (r.score || 0) >= HIGH_CONFIDENCE; });
        displayed = highConfidence.length >= 3
          ? highConfidence.slice(0, 5)
          : allResults.slice(0, 5);
      } else {
        // weak_match: show top 5, banner already warns the user
        displayed = allResults.slice(0, 5);
      }
      var hiddenCount = allResults.length - displayed.length;
      var cards = displayed.map(renderCard).join('');
      var hiddenNote = hiddenCount > 0
        ? '<p class="hidden-note"><em>' + hiddenCount + ' weaker match' + (hiddenCount === 1 ? '' : 'es') + ' hidden</em></p>'
        : '';
      var empty = !cards
        ? '<div class="empty-results">No matching results were returned.</div>'
        : '';
      el.innerHTML =
        banner +
        '<p class="results-label">Top matches</p>' +
        summaryLine +
        cards +
        hiddenNote +
        empty;
    }

    // -- Card rendering ----------------------------------------------------

    function cardHeading(result) {
      if (result.source === 'slack') {
        return result.channel_name ? '#' + result.channel_name : 'Slack message';
      }
      return result.title || 'Notion page';
    }

    function slackMeta(result) {
      var parts = [];
      if (typeof result.reply_count === 'number') {
        parts.push('<span class="meta-chip">' + result.reply_count + ' replies</span>');
      }
      if (Array.isArray(result.reactions) && result.reactions.length > 0) {
        var rx = result.reactions
          .map(function(r) { return ':' + r.name + ': ' + r.count; })
          .join(' ');
        parts.push('<span class="meta-chip">' + escapeText(rx) + '</span>');
      }
      if (parts.length === 0) return '';
      return '<div class="result-meta">' + parts.join('') + '</div>';
    }

    function renderCard(result, index) {
      var heading = cardHeading(result);
      var snippet = result.text ? '<p class="card-snippet">' + escapeText(result.text) + '</p>' : '';
      var summary = result.summary ? '<p class="card-summary">' + escapeText(result.summary) + '</p>' : '';
      var breakdown = result.score_breakdown
        ? '<p class="breakdown-line"><span class="breakdown-label">Why this matched:</span> ' + escapeText(result.score_breakdown) + '</p>'
        : '';
      var meta = result.source === 'slack' ? slackMeta(result) : '';
      var links = (result.source_links || [])
        .map(function(l) { return '<a href="' + escapeAttr(l) + '">' + escapeText(l) + '</a>'; })
        .join('');
      return (
        '<div class="card" id="card-' + index + '">' +
          '<div class="card-header" data-index="' + index + '">' +
            '<span class="source-badge ' + escapeAttr(result.source) + '">' + escapeText(result.source) + '</span>' +
            '<span class="card-title">' + escapeText(heading) + '</span>' +
            '<span class="score-chip ' + escapeAttr(result.source) + '">Relevancy: ' + Math.round((result.score || 0) * 100) + '%</span>' +
            '<span class="chevron">&#9654;</span>' +
          '</div>' +
          '<div class="card-body">' +
            snippet +
            summary +
            breakdown +
            meta +
            '<div class="source-links">' + links + '</div>' +
          '</div>' +
        '</div>'
      );
    }

    function toggleCard(index) {
      var el = document.getElementById('card-' + index);
      if (el) el.classList.toggle('open');
    }

    // -- Explain renderer --------------------------------------------------

    function renderExplain(data) {
      var explanation = (data && data.explanation) || '';
      var fix = (data && data.suggested_fix) || '';
      var el = document.getElementById('results');
      el.style.display = 'block';
      el.innerHTML =
        '<p class="results-label">Explanation</p>' +
        '<div class="explain-panel">' +
          '<div class="explain-section">' +
            '<p class="explain-section-label">What happened</p>' +
            '<p>' + escapeText(explanation) + '</p>' +
          '</div>' +
          (fix
            ? '<div class="explain-section">' +
                '<p class="explain-section-label">Suggested fix</p>' +
                '<pre>' + escapeText(fix) + '</pre>' +
              '</div>'
            : '') +
        '</div>';
    }

    // -- No match renderer -------------------------------------------------

    function renderNoMatchResponse(data) {
      var channelName = (data && data.channel_name) || 'help';
      var permalink = (data && data.channel_permalink) || '#';
      var draft = (data && data.draft_message) || '';
      var errorType = (data && data.error_type) ? data.error_type : '';
      var el = document.getElementById('results');
      el.style.display = 'block';
      el.innerHTML =
        '<p class="results-label">No match found</p>' +
        '<div class="no-match-panel">' +
          (errorType ? '<p class="error-type-tag">Classified as: <strong>' + escapeText(errorType) + '</strong></p>' : '') +
          '<h3>Suggested channel</h3>' +
          '<a class="channel-link" href="' + escapeAttr(permalink) + '">#' + escapeText(channelName) + '</a>' +
          '<p class="draft-label">Pre-drafted message</p>' +
          '<div class="draft-message" id="draft-text">' + escapeText(draft) + '</div>' +
          '<button class="secondary copy-btn">Copy message</button>' +
        '</div>';
    }

    // -- Helpers -----------------------------------------------------------

    function escapeText(s) {
      if (s == null) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    function escapeAttr(s) { return escapeText(s); }
  `;
}
