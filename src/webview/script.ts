export function getWebviewScript(): string {
  return `
    const vscode = acquireVsCodeApi();
    const errorText = document.getElementById('__error-raw').textContent;
    console.log('[error-assistant] webview script initialized, errorText length:', errorText ? errorText.length : 0);

    document.getElementById('btn-search').addEventListener('click', function() {
      console.log('[error-assistant] Search button clicked');
      cycleSearchDemo();
    });
    document.getElementById('btn-explain').addEventListener('click', function() {
      console.log('[error-assistant] Explain button clicked');
      vscode.postMessage({ command: 'explain', error: errorText });
      showExplainDemo();
    });
    document.getElementById('btn-no-match').addEventListener('click', function() {
      console.log('[error-assistant] No Match button clicked');
      vscode.postMessage({ command: 'no_match', error: errorText });
      showNoMatch();
    });

    // Event delegation for dynamically rendered buttons (copy, card toggles)
    document.getElementById('results').addEventListener('click', function(event) {
      var target = event.target;
      if (target.classList.contains('copy-btn')) {
        var text = document.getElementById('draft-text').innerText;
        navigator.clipboard.writeText(text);
        return;
      }
      var header = target.closest('.card-header');
      if (header) {
        var index = header.getAttribute('data-index');
        if (index !== null) toggleCard(parseInt(index, 10));
      }
    });

    window.addEventListener('message', function(event) {
      const msg = event.data;
      console.log('[error-assistant] message from extension:', msg);
    });

    function showLoading(label) {
      console.log('[error-assistant] showLoading:', label);
      const results = document.getElementById('results');
      results.style.display = 'block';
      results.innerHTML =
        '<div class="loading">' +
          '<div class="spinner"></div>' +
          '<span>' + label + '</span>' +
        '</div>';
    }

    const mockSearchResponse = {
      core_error: 'NoMethodError: undefined method save! for nil:NilClass',
      query: 'NoMethodError save! nil:NilClass UserAccount payments',
      extracted_keywords: {
        exception_class: 'NoMethodError',
        method_name: 'save!',
        domain_keywords: ['payments', 'useraccount']
      },
      match_status: 'strong_match',
      weak_match_threshold: 0.5,
      common_keywords: ['save!', 'nil', 'UserAccount', 'payments'],
      results: [
        {
          source: 'slack',
          text: 'Hit NoMethodError on save! in payments flow today. Anyone seen this?',
          permalink: 'https://cleo.slack.com/archives/C123/p456',
          source_links: ['https://cleo.slack.com/archives/C123/p456'],
          score: 0.92,
          score_breakdown: 'exception match, resolved reply, positive reactions',
          summary: 'Resolved by adding a nil check before calling save! on the UserAccount object. Fix shipped in PR #4421.',
          channel_name: 'payments-incidents',
          channel_id: 'C123',
          ts: '1714000000.000100',
          reactions: [{ name: 'white_check_mark', count: 4 }, { name: 'tada', count: 2 }],
          reply_count: 7
        },
        {
          source: 'notion',
          text: 'Runbook covering nil object errors in the payments domain.',
          permalink: 'https://notion.so/cleo/payment-nil-errors',
          source_links: ['https://notion.so/cleo/payment-nil-errors'],
          score: 0.78,
          score_breakdown: 'keyword density, domain match',
          summary: 'Runbook covering nil object errors in the payments domain. Recommends checking object initialisation order.',
          title: 'Payment service nil object errors',
          ts: '2025-04-22T10:15:00Z'
        },
        {
          source: 'slack',
          text: 'save! failing intermittently on UserAccount - looks like missing migration',
          permalink: 'https://cleo.slack.com/archives/C789/p012',
          source_links: ['https://cleo.slack.com/archives/C789/p012'],
          score: 0.61,
          score_breakdown: 'method match, recent',
          summary: 'Thread discussing intermittent save! failures. Resolved after the pending database migration was applied.',
          channel_name: 'backend-help',
          channel_id: 'C789',
          ts: '1713800000.000200',
          reactions: [{ name: 'eyes', count: 1 }],
          reply_count: 3
        }
      ]
    };
    const mockResults = mockSearchResponse.results;

    const mockNoMatch = {
      error_type: 'nil_reference',
      channel_name: 'payments-incidents',
      channel_permalink: 'https://cleo.slack.com/channels/payments-incidents',
      draft_message: 'Hey team, seeing a NoMethodError on save! in the payments flow. Anyone run into this before? Pointers appreciated.'
    };

    const mockExplain = {
      explanation: 'This error occurs when you call save! on a nil object. nil:NilClass is Ruby\\'s null type - calling any method on it raises NoMethodError. The object was likely never initialised, or a database query returned nil instead of a record.',
      suggested_fix: 'if user_account\\n  user_account.save!\\nelse\\n  Rails.logger.warn "UserAccount not found"\\nend\\n\\n# Or use safe navigation\\nuser_account&.save!'
    };

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
        parts.push('<span class="meta-chip">' + rx + '</span>');
      }
      if (parts.length === 0) return '';
      return '<div class="result-meta">' + parts.join('') + '</div>';
    }

    function renderCard(result, index) {
      var heading = cardHeading(result);
      var snippet = result.text ? '<p class="card-snippet">' + result.text + '</p>' : '';
      var summary = result.summary ? '<p class="card-summary">' + result.summary + '</p>' : '';
      var breakdown = result.score_breakdown
        ? '<p class="breakdown-line"><span class="breakdown-label">Why this matched:</span> ' + result.score_breakdown + '</p>'
        : '';
      var meta = result.source === 'slack' ? slackMeta(result) : '';
      var links = (result.source_links || [])
        .map(function(l) { return '<a href="' + l + '">' + l + '</a>'; })
        .join('');
      return (
        '<div class="card" id="card-' + index + '">' +
          '<div class="card-header" data-index="' + index + '">' +
            '<span class="source-badge ' + result.source + '">' + result.source + '</span>' +
            '<span class="card-title">' + heading + '</span>' +
            '<span class="score-chip">' + Math.round(result.score * 100) + '%</span>' +
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
      document.getElementById('card-' + index).classList.toggle('open');
    }

    function showResults(type) {
      console.log('[error-assistant] showResults:', type);
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
      vscode.postMessage({ command: 'search', error: errorText });
      var state = demoStates[demoIndex % demoStates.length];
      demoIndex++;
      if (state === 'no_match') {
        showNoMatch();
      } else {
        showLoading('Searching Slack &amp; Notion...');
        setTimeout(function() { showResults(state); }, 800);
      }
    }

    var mockDraft = "Hey team, seeing a NoMethodError on save! in the payments flow. Error: NoMethodError: undefined method ‘save!’ for nil:NilClass. Has anyone run into this before? Any pointers appreciated ";

    function showNoMatch() {
      console.log('[error-assistant] showNoMatch');
      const results = document.getElementById('results');
      results.style.display = 'block';
      results.innerHTML =
        '<p class="results-label">No match found</p>' +
        '<div class="no-match-panel">' +
          '<h3>Suggested channel</h3>' +
          '<a class="channel-link" href="https://cleo.slack.com/channels/payments-incidents">#payments-incidents</a>' +
          '<p class="draft-label">Pre-drafted message</p>' +
          '<div class="draft-message" id="draft-text">' + mockDraft + '</div>' +
          '<button class="secondary copy-btn">Copy message</button>' +
        '</div>';
    }

    function showExplainDemo() {
      console.log('[error-assistant] showExplainDemo');
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
              '<pre>// Add a nil check before calling save!\\nif user_account\\n  user_account.save!\\nelse\\n  Rails.logger.warn "UserAccount not found"\\nend\\n\\n// Or use the safe navigation operator\\nuser_account&amp;.save!</pre>' +
            '</div>' +
          '</div>';
      }, 900);
    }
  `;
}
