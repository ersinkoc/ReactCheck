/**
 * Dashboard HTML generator for WebUI
 * @packageDocumentation
 */

/**
 * Generate the dashboard HTML
 * @param wsPort - WebSocket port
 * @param target - Target URL
 * @returns HTML string
 */
export function generateDashboardHTML(wsPort: number, target: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReactCheck Dashboard</title>
  <style>${getStyles()}</style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-left">
        <h1>
          <span class="logo">⚛️</span>
          ReactCheck
          <span class="status" id="status">
            <span class="status-dot"></span>
            <span class="status-text">Connecting...</span>
          </span>
        </h1>
        <div class="header-meta">
          <span id="target">Target: ${escapeHtml(target)}</span>
          <span class="separator">•</span>
          <span id="duration">Duration: 0s</span>
        </div>
      </div>
      <div class="header-right">
        <button id="export-btn" class="btn btn-secondary" disabled>Export Report</button>
      </div>
    </header>

    <section class="summary">
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-value info" id="components">0</div>
          <div class="summary-label">Components</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" id="renders">0</div>
          <div class="summary-label">Total Renders</div>
        </div>
        <div class="summary-card">
          <div class="summary-value critical" id="critical">0</div>
          <div class="summary-label">Critical</div>
        </div>
        <div class="summary-card">
          <div class="summary-value warning" id="warnings">0</div>
          <div class="summary-label">Warnings</div>
        </div>
        <div class="summary-card">
          <div class="summary-value healthy" id="healthy">0</div>
          <div class="summary-label">Healthy</div>
        </div>
        <div class="summary-card">
          <div class="summary-value" id="fps">60</div>
          <div class="summary-label">Avg FPS</div>
        </div>
      </div>
    </section>

    <section class="content">
      <div class="panel components-panel">
        <div class="panel-header">
          <h2>Components</h2>
          <input type="text" id="search" placeholder="Search components..." class="search-input">
        </div>
        <div class="table-container">
          <table class="component-table">
            <thead>
              <tr>
                <th class="sortable" data-sort="name">Component</th>
                <th class="sortable" data-sort="renders">Renders</th>
                <th class="sortable" data-sort="unnecessary">Unnecessary</th>
                <th class="sortable" data-sort="avgTime">Avg Time</th>
                <th class="sortable" data-sort="severity">Severity</th>
              </tr>
            </thead>
            <tbody id="component-list">
              <tr class="empty-row">
                <td colspan="5">Waiting for data...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel events-panel">
        <div class="panel-header">
          <h2>Live Events</h2>
          <span class="event-count" id="event-count">0 events</span>
        </div>
        <div class="events-container" id="events">
          <div class="empty-message">Waiting for render events...</div>
        </div>
      </div>
    </section>

    <section class="chains-section">
      <div class="panel">
        <div class="panel-header">
          <h2>Render Chains</h2>
        </div>
        <div class="chains-container" id="chains">
          <div class="empty-message">No render chains detected yet...</div>
        </div>
      </div>
    </section>
  </div>
  <script>${getScript(wsPort)}</script>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
      --accent-purple: #a855f7;
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
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .header h1 {
      font-size: 1.75rem;
      color: var(--accent-green);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logo {
      font-size: 1.5rem;
    }

    .status {
      font-size: 0.875rem;
      font-weight: normal;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem;
      background: var(--bg-tertiary);
      border-radius: 9999px;
      margin-left: 0.75rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-yellow);
      animation: pulse 2s infinite;
    }

    .status.connected .status-dot {
      background: var(--accent-green);
      animation: none;
    }

    .status.scanning .status-dot {
      background: var(--accent-blue);
      animation: pulse 1s infinite;
    }

    .status.paused .status-dot {
      background: var(--accent-yellow);
      animation: none;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .header-meta {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .separator {
      margin: 0 0.5rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: none;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .btn-secondary:hover:not(:disabled) {
      background: var(--border-color);
    }

    /* Summary */
    .summary {
      margin-bottom: 1.5rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 1rem;
    }

    @media (max-width: 900px) {
      .summary-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 500px) {
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .summary-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
      transition: transform 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-2px);
    }

    .summary-value {
      font-size: 2rem;
      font-weight: bold;
      transition: all 0.3s;
    }

    .summary-value.updated {
      transform: scale(1.1);
    }

    .summary-label {
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .critical { color: var(--accent-red); }
    .warning { color: var(--accent-yellow); }
    .healthy { color: var(--accent-green); }
    .info { color: var(--accent-blue); }

    /* Content */
    .content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 900px) {
      .content {
        grid-template-columns: 1fr;
      }
    }

    .panel {
      background: var(--bg-secondary);
      border-radius: 8px;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .panel-header h2 {
      font-size: 1rem;
      font-weight: 600;
    }

    .search-input {
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 0.875rem;
      width: 200px;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--accent-blue);
    }

    .search-input::placeholder {
      color: var(--text-secondary);
    }

    /* Table */
    .table-container {
      max-height: 400px;
      overflow-y: auto;
    }

    .component-table {
      width: 100%;
      border-collapse: collapse;
    }

    .component-table th,
    .component-table td {
      padding: 0.75rem 1rem;
      text-align: left;
    }

    .component-table th {
      background: var(--bg-tertiary);
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .component-table th.sortable {
      cursor: pointer;
    }

    .component-table th.sortable:hover {
      color: var(--text-primary);
    }

    .component-table th.sorted-asc::after {
      content: ' ↑';
    }

    .component-table th.sorted-desc::after {
      content: ' ↓';
    }

    .component-table tbody tr {
      border-bottom: 1px solid var(--border-color);
      transition: background 0.2s;
    }

    .component-table tbody tr:hover {
      background: var(--bg-tertiary);
    }

    .component-table tbody tr.new-row {
      animation: highlight 1s ease-out;
    }

    @keyframes highlight {
      from { background: rgba(59, 130, 246, 0.2); }
      to { background: transparent; }
    }

    .component-name {
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .severity-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .severity-badge.critical {
      background: rgba(239, 68, 68, 0.2);
    }

    .severity-badge.warning {
      background: rgba(234, 179, 8, 0.2);
    }

    .severity-badge.healthy {
      background: rgba(34, 197, 94, 0.2);
    }

    .empty-row td {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem;
    }

    /* Events */
    .events-container {
      max-height: 400px;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .event-count {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .event-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .event-item:nth-child(odd) {
      background: var(--bg-tertiary);
    }

    .event-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .event-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .event-time {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .empty-message {
      color: var(--text-secondary);
      text-align: center;
      padding: 2rem;
      font-size: 0.875rem;
    }

    /* Chains */
    .chains-section .panel {
      min-height: 150px;
    }

    .chains-container {
      padding: 1rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .chain-item {
      background: var(--bg-tertiary);
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 0.75rem;
      animation: slideIn 0.3s ease-out;
    }

    .chain-trigger {
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: var(--accent-purple);
    }

    .chain-flow {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.875rem;
      color: var(--text-secondary);
      overflow-x: auto;
      white-space: nowrap;
      padding: 0.5rem 0;
    }

    .chain-flow span {
      color: var(--text-primary);
    }

    .chain-flow .arrow {
      color: var(--accent-yellow);
      margin: 0 0.25rem;
    }

    .chain-meta {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 0.5rem;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: var(--bg-primary);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-secondary);
    }
  `;
}

/**
 * Get JavaScript code
 */
function getScript(wsPort: number): string {
  return `
    (function() {
      // State
      let ws = null;
      let state = null;
      let startTime = Date.now();
      let eventCount = 0;
      let sortColumn = 'renders';
      let sortDirection = 'desc';
      let searchQuery = '';

      // Elements
      const statusEl = document.getElementById('status');
      const statusTextEl = statusEl.querySelector('.status-text');
      const durationEl = document.getElementById('duration');
      const componentsEl = document.getElementById('components');
      const rendersEl = document.getElementById('renders');
      const criticalEl = document.getElementById('critical');
      const warningsEl = document.getElementById('warnings');
      const healthyEl = document.getElementById('healthy');
      const fpsEl = document.getElementById('fps');
      const componentListEl = document.getElementById('component-list');
      const eventsEl = document.getElementById('events');
      const eventCountEl = document.getElementById('event-count');
      const chainsEl = document.getElementById('chains');
      const searchEl = document.getElementById('search');
      const exportBtn = document.getElementById('export-btn');

      // Connect to WebSocket
      function connect() {
        ws = new WebSocket('ws://localhost:${wsPort}');

        ws.onopen = () => {
          statusEl.className = 'status connected';
          statusTextEl.textContent = 'Connected';
          exportBtn.disabled = false;
        };

        ws.onclose = () => {
          statusEl.className = 'status';
          statusTextEl.textContent = 'Disconnected';
          exportBtn.disabled = true;
          setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleMessage(msg);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };
      }

      // Handle incoming messages
      function handleMessage(msg) {
        switch (msg.type) {
          case 'state':
            state = msg.payload;
            startTime = msg.payload.startTime;
            updateStatus(msg.payload);
            updateSummary(msg.payload.summary);
            renderComponents(msg.payload.components);
            renderChains(msg.payload.chains);
            break;

          case 'summary-update':
            updateSummary(msg.payload);
            break;

          case 'component-update':
            updateComponent(msg.payload);
            break;

          case 'render-event':
            addEvent(msg.payload);
            break;

          case 'chain-detected':
            addChain(msg.payload);
            break;

          case 'scanning-status':
            updateScanningStatus(msg.payload);
            break;
        }
      }

      // Update status
      function updateStatus(data) {
        if (data.scanning && !data.paused) {
          statusEl.className = 'status scanning';
          statusTextEl.textContent = 'Scanning';
        } else if (data.paused) {
          statusEl.className = 'status paused';
          statusTextEl.textContent = 'Paused';
        } else {
          statusEl.className = 'status connected';
          statusTextEl.textContent = 'Connected';
        }
      }

      function updateScanningStatus(data) {
        if (data.scanning && !data.paused) {
          statusEl.className = 'status scanning';
          statusTextEl.textContent = 'Scanning';
        } else if (data.paused) {
          statusEl.className = 'status paused';
          statusTextEl.textContent = 'Paused';
        } else {
          statusEl.className = 'status connected';
          statusTextEl.textContent = 'Connected';
        }
      }

      // Update summary with animation
      function updateSummary(summary) {
        animateValue(componentsEl, summary.totalComponents);
        animateValue(rendersEl, summary.totalRenders);
        animateValue(criticalEl, summary.criticalIssues);
        animateValue(warningsEl, summary.warnings);
        animateValue(healthyEl, summary.healthy);
        animateValue(fpsEl, summary.avgFps);
      }

      function animateValue(el, value) {
        const current = parseInt(el.textContent) || 0;
        if (current !== value) {
          el.textContent = value;
          el.classList.add('updated');
          setTimeout(() => el.classList.remove('updated'), 300);
        }
      }

      // Update single component
      function updateComponent(component) {
        if (!state) state = { components: [] };
        const idx = state.components.findIndex(c => c.name === component.name);
        if (idx >= 0) {
          state.components[idx] = component;
        } else {
          state.components.push(component);
        }
        renderComponents(state.components);
      }

      // Render components table
      function renderComponents(components) {
        if (!components || components.length === 0) {
          componentListEl.innerHTML = '<tr class="empty-row"><td colspan="5">No components detected yet...</td></tr>';
          return;
        }

        // Filter
        let filtered = components;
        if (searchQuery) {
          filtered = components.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        // Sort
        filtered.sort((a, b) => {
          let aVal, bVal;
          switch (sortColumn) {
            case 'name': aVal = a.name; bVal = b.name; break;
            case 'renders': aVal = a.renders; bVal = b.renders; break;
            case 'unnecessary': aVal = a.unnecessary; bVal = b.unnecessary; break;
            case 'avgTime': aVal = a.avgRenderTime; bVal = b.avgRenderTime; break;
            case 'severity':
              const order = { critical: 0, warning: 1, info: 2, healthy: 3 };
              aVal = order[a.severity] ?? 4;
              bVal = order[b.severity] ?? 4;
              break;
            default: aVal = a.renders; bVal = b.renders;
          }
          if (typeof aVal === 'string') {
            return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
          }
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        componentListEl.innerHTML = filtered.slice(0, 100).map(c => \`
          <tr data-name="\${escapeHtml(c.name)}">
            <td class="component-name">
              <span class="severity-indicator \${c.severity}"></span>
              \${escapeHtml(c.name)}
            </td>
            <td>\${c.renders}</td>
            <td>\${c.unnecessary}</td>
            <td>\${c.avgRenderTime.toFixed(2)}ms</td>
            <td><span class="severity-badge \${c.severity}">\${c.severity}</span></td>
          </tr>
        \`).join('');
      }

      // Add event to timeline
      function addEvent(render) {
        eventCount++;
        eventCountEl.textContent = eventCount + ' events';

        const isEmpty = eventsEl.querySelector('.empty-message');
        if (isEmpty) isEmpty.remove();

        const severityColor = {
          critical: 'var(--accent-red)',
          warning: 'var(--accent-yellow)',
          info: 'var(--accent-blue)',
          healthy: 'var(--accent-green)'
        };

        const color = render.renderCount > 50 ? severityColor.critical :
                      render.renderCount > 20 ? severityColor.warning :
                      severityColor.healthy;

        const time = new Date(render.timestamp || Date.now()).toLocaleTimeString();

        const eventHtml = \`
          <div class="event-item">
            <div class="event-dot" style="background: \${color}"></div>
            <span class="event-name">\${escapeHtml(render.componentName)}</span>
            <span class="event-time">\${time}</span>
          </div>
        \`;

        eventsEl.insertAdjacentHTML('afterbegin', eventHtml);

        // Keep only last 100 events
        while (eventsEl.children.length > 100) {
          eventsEl.lastChild.remove();
        }
      }

      // Render chains
      function renderChains(chains) {
        if (!chains || chains.length === 0) {
          chainsEl.innerHTML = '<div class="empty-message">No render chains detected yet...</div>';
          return;
        }

        chainsEl.innerHTML = chains.slice(0, 10).map(chain => \`
          <div class="chain-item">
            <div class="chain-trigger">Trigger: \${escapeHtml(chain.trigger)}</div>
            <div class="chain-flow">
              \${chain.chain.map((c, i) =>
                i === 0 ? \`<span style="color: var(--accent-red)">\${escapeHtml(c)}</span>\` :
                \`<span class="arrow">→</span><span>\${escapeHtml(c)}</span>\`
              ).join('')}
            </div>
            <div class="chain-meta">Depth: \${chain.depth} • Renders: \${chain.totalRenders}</div>
          </div>
        \`).join('');
      }

      // Add chain
      function addChain(chain) {
        if (!state) state = { chains: [] };
        state.chains.unshift(chain);
        if (state.chains.length > 20) state.chains.pop();
        renderChains(state.chains);
      }

      // Escape HTML
      function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');
      }

      // Update duration
      function updateDuration() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        durationEl.textContent = 'Duration: ' + (mins > 0 ? mins + 'm ' : '') + secs + 's';
      }

      // Setup sorting
      document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const column = th.dataset.sort;
          if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            sortColumn = column;
            sortDirection = 'desc';
          }

          document.querySelectorAll('.sortable').forEach(el => {
            el.classList.remove('sorted-asc', 'sorted-desc');
          });
          th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');

          if (state && state.components) {
            renderComponents(state.components);
          }
        });
      });

      // Setup search
      searchEl.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (state && state.components) {
          renderComponents(state.components);
        }
      });

      // Setup export
      exportBtn.addEventListener('click', () => {
        if (!state) return;
        const data = JSON.stringify(state, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reactcheck-export-' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
      });

      // Start
      connect();
      setInterval(updateDuration, 1000);

      // Mark initial sort column
      document.querySelector('[data-sort="renders"]').classList.add('sorted-desc');
    })();
  `;
}
