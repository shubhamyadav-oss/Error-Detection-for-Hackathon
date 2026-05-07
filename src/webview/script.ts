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
      vscode.postMessage({ command: 'explain', errorText: errorText });
      showExplainDemo();
    });
    document.getElementById('btn-no-match').addEventListener('click', function() {
      console.log('[error-assistant] No Match button clicked');
      vscode.postMessage({ command: 'no_match', errorText: errorText });
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
          '<div class="card-header" data-index="' + index + '">' +
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
