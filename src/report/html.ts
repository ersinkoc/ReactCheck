/**
 * HTML report generator
 * @packageDocumentation
 */

import type { SessionReport, ComponentStats, FixSuggestion } from '../types.js';
import { formatDuration, formatNumber, formatRenderTime, escapeHtml } from '../utils/format.js';

/**
 * Generate an HTML report
 * @param report - Session report data
 * @returns HTML string
 */
export function generateHTMLReport(report: SessionReport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReactCheck Report - ${escapeHtml(report.session.url)}</title>
  <style>${getStyles()}</style>
</head>
<body>
  <div class="container">
    ${renderHeader(report)}
    ${renderSummary(report)}
    ${renderIssues(report)}
    ${renderChains(report)}
    ${renderSuggestions(report)}
    ${renderAllComponents(report)}
    ${renderFooter(report)}
  </div>
  <script>${getScript()}</script>
</body>
</html>`;
}

/**
 * Get CSS styles
 */
function getStyles(): string {
  return `
    :root {
      --bg-primary: #0a0a0a;
      --bg-secondary: #141414;
      --bg-tertiary: #1f1f1f;
      --text-primary: #ffffff;
      --text-secondary: #a1a1aa;
      --accent-red: #ef4444;
      --accent-yellow: #eab308;
      --accent-green: #22c55e;
      --accent-blue: #3b82f6;
      --border-color: #27272a;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    h1, h2, h3, h4 {
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 2rem;
      color: var(--accent-green);
    }

    h2 {
      font-size: 1.5rem;
      margin-top: 2rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    h3 {
      font-size: 1.25rem;
    }

    a {
      color: var(--accent-blue);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .header {
      margin-bottom: 2rem;
    }

    .header-meta {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }

    .summary-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }

    .summary-value {
      font-size: 2rem;
      font-weight: bold;
    }

    .summary-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      text-transform: uppercase;
    }

    .critical { color: var(--accent-red); }
    .warning { color: var(--accent-yellow); }
    .healthy { color: var(--accent-green); }
    .info { color: var(--accent-blue); }

    .issue-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      border-left: 4px solid;
    }

    .issue-card.critical { border-color: var(--accent-red); }
    .issue-card.warning { border-color: var(--accent-yellow); }

    .issue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .issue-name {
      font-weight: bold;
      font-size: 1.1rem;
    }

    .issue-stats {
      display: flex;
      gap: 1rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .chain-item {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .chain-visual {
      font-family: monospace;
      background: var(--bg-tertiary);
      padding: 0.5rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 0.5rem 0;
    }

    .suggestion-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .suggestion-fix {
      display: inline-block;
      background: var(--accent-blue);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      margin-right: 0.5rem;
    }

    .code-block {
      background: var(--bg-tertiary);
      border-radius: 4px;
      padding: 1rem;
      overflow-x: auto;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.875rem;
      margin: 0.5rem 0;
    }

    .collapsible {
      cursor: pointer;
    }

    .collapsible::before {
      content: '▶ ';
      font-size: 0.75rem;
    }

    .collapsible.open::before {
      content: '▼ ';
    }

    .collapsible-content {
      display: none;
      margin-top: 0.5rem;
    }

    .collapsible.open + .collapsible-content {
      display: block;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    th {
      background: var(--bg-secondary);
      font-weight: 600;
    }

    tr:hover {
      background: var(--bg-secondary);
    }

    .badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge.critical { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }
    .badge.warning { background: rgba(234, 179, 8, 0.2); color: var(--accent-yellow); }
    .badge.healthy { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); }

    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 0.875rem;
      text-align: center;
    }

    .search-box {
      margin: 1rem 0;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent-blue);
    }

    @media print {
      body {
        background: white;
        color: black;
      }

      .container {
        max-width: none;
      }

      .collapsible-content {
        display: block !important;
      }
    }
  `;
}

/**
 * Get JavaScript for interactivity
 */
function getScript(): string {
  return `
    // Toggle collapsible sections
    document.querySelectorAll('.collapsible').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('open');
      });
    });

    // Search functionality
    const searchInput = document.getElementById('component-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.component-row').forEach(row => {
          const name = row.dataset.name?.toLowerCase() || '';
          row.style.display = name.includes(query) ? '' : 'none';
        });
      });
    }
  `;
}

/**
 * Render header section
 */
function renderHeader(report: SessionReport): string {
  return `
    <header class="header">
      <h1>ReactCheck Report</h1>
      <div class="header-meta">
        <p><strong>URL:</strong> ${escapeHtml(report.session.url)}</p>
        <p><strong>Duration:</strong> ${formatDuration(report.session.duration)}</p>
        <p><strong>Date:</strong> ${new Date(report.session.timestamp).toLocaleString()}</p>
        <p><strong>Session ID:</strong> ${escapeHtml(report.session.id)}</p>
      </div>
    </header>
  `;
}

/**
 * Render summary section
 */
function renderSummary(report: SessionReport): string {
  const { summary } = report;

  return `
    <section>
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-value">${formatNumber(summary.totalComponents)}</div>
          <div class="summary-label">Components</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${formatNumber(summary.totalRenders)}</div>
          <div class="summary-label">Renders</div>
        </div>
        <div class="summary-card">
          <div class="summary-value critical">${summary.criticalIssues}</div>
          <div class="summary-label">Critical</div>
        </div>
        <div class="summary-card">
          <div class="summary-value warning">${summary.warnings}</div>
          <div class="summary-label">Warnings</div>
        </div>
        <div class="summary-card">
          <div class="summary-value healthy">${summary.healthy}</div>
          <div class="summary-label">Healthy</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${summary.avgFps}</div>
          <div class="summary-label">Avg FPS</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render issues section
 */
function renderIssues(report: SessionReport): string {
  const criticals = report.components.filter((c) => c.severity === 'critical');
  const warnings = report.components.filter((c) => c.severity === 'warning');

  if (criticals.length === 0 && warnings.length === 0) {
    return `
      <section>
        <h2>Issues</h2>
        <p class="healthy">✓ No critical issues or warnings found!</p>
      </section>
    `;
  }

  let html = '<section><h2>Issues</h2>';

  if (criticals.length > 0) {
    html += '<h3 class="critical">🔴 Critical Issues</h3>';
    for (const comp of criticals) {
      html += renderIssueCard(comp, 'critical', report.suggestions);
    }
  }

  if (warnings.length > 0) {
    html += '<h3 class="warning">🟡 Warnings</h3>';
    for (const comp of warnings.slice(0, 10)) {
      html += renderIssueCard(comp, 'warning', report.suggestions);
    }
    if (warnings.length > 10) {
      html += `<p class="text-secondary">...and ${warnings.length - 10} more warnings</p>`;
    }
  }

  html += '</section>';
  return html;
}

/**
 * Render single issue card
 */
function renderIssueCard(comp: ComponentStats, severity: string, suggestions: FixSuggestion[]): string {
  const compSuggestions = suggestions.filter((s) => s.componentName === comp.name);

  return `
    <div class="issue-card ${severity}">
      <div class="issue-header">
        <span class="issue-name">${escapeHtml(comp.name)}</span>
        <div class="issue-stats">
          <span>${formatNumber(comp.renders)} renders</span>
          <span>${comp.unnecessary} unnecessary</span>
          <span>${formatRenderTime(comp.avgRenderTime)} avg</span>
        </div>
      </div>
      ${compSuggestions.length > 0 ? `
        <p><strong>Suggested Fix:</strong> ${escapeHtml(compSuggestions[0]?.fix ?? '')}</p>
        <p>${escapeHtml(compSuggestions[0]?.issue ?? '')}</p>
      ` : ''}
    </div>
  `;
}

/**
 * Render chains section
 */
function renderChains(report: SessionReport): string {
  if (report.chains.length === 0) {
    return '';
  }

  let html = '<section><h2>Render Chains</h2>';

  for (const chain of report.chains.slice(0, 5)) {
    html += `
      <div class="chain-item">
        <h4>${escapeHtml(chain.trigger)}</h4>
        <div class="chain-visual">${chain.chain.map(escapeHtml).join(' → ')}</div>
        <p>Depth: ${chain.depth} | Renders: ${chain.totalRenders} | Root: ${escapeHtml(chain.rootCause)}</p>
      </div>
    `;
  }

  if (report.chains.length > 5) {
    html += `<p>...and ${report.chains.length - 5} more chains</p>`;
  }

  html += '</section>';
  return html;
}

/**
 * Render suggestions section
 */
function renderSuggestions(report: SessionReport): string {
  const top = report.suggestions.filter((s) => s.severity === 'critical' || s.severity === 'warning').slice(0, 5);

  if (top.length === 0) {
    return '';
  }

  let html = '<section><h2>Top Fix Suggestions</h2>';

  for (const suggestion of top) {
    html += `
      <div class="suggestion-card">
        <span class="suggestion-fix">${escapeHtml(suggestion.fix)}</span>
        <span class="badge ${suggestion.severity}">${suggestion.severity}</span>
        <h4>${escapeHtml(suggestion.componentName)}</h4>
        <p>${escapeHtml(suggestion.issue)}</p>
        <h5 class="collapsible">Show Code</h5>
        <div class="collapsible-content">
          <p><strong>Before:</strong></p>
          <pre class="code-block">${escapeHtml(suggestion.codeBefore.slice(0, 500))}</pre>
          <p><strong>After:</strong></p>
          <pre class="code-block">${escapeHtml(suggestion.codeAfter.slice(0, 500))}</pre>
        </div>
      </div>
    `;
  }

  html += '</section>';
  return html;
}

/**
 * Render all components table
 */
function renderAllComponents(report: SessionReport): string {
  const sorted = [...report.components].sort((a, b) => b.renders - a.renders);

  let html = `
    <section>
      <h2>All Components</h2>
      <div class="search-box">
        <input type="text" id="component-search" class="search-input" placeholder="Search components...">
      </div>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Renders</th>
            <th>Unnecessary</th>
            <th>Avg Time</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const comp of sorted.slice(0, 100)) {
    html += `
      <tr class="component-row" data-name="${escapeHtml(comp.name)}">
        <td>${escapeHtml(comp.name)}</td>
        <td>${formatNumber(comp.renders)}</td>
        <td>${comp.unnecessary}</td>
        <td>${formatRenderTime(comp.avgRenderTime)}</td>
        <td><span class="badge ${comp.severity}">${comp.severity}</span></td>
      </tr>
    `;
  }

  html += '</tbody></table>';

  if (sorted.length > 100) {
    html += `<p>Showing top 100 of ${sorted.length} components</p>`;
  }

  html += '</section>';
  return html;
}

/**
 * Render footer
 */
function renderFooter(report: SessionReport): string {
  return `
    <footer class="footer">
      <p>Generated by <a href="https://ersinkoc.github.io/reactcheck">ReactCheck</a> v${report.version}</p>
    </footer>
  `;
}
