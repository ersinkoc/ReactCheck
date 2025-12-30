/**
 * Programmatic scanner example
 *
 * This example shows how to use the Scanner class directly for
 * custom integrations and real-time monitoring.
 */

import {
  Scanner,
  StatsCollector,
  ChainAnalyzer,
  FixSuggester,
  generateHTMLReport,
  type RenderInfo,
} from '@oxog/react-check';

// Create scanner with configuration
const scanner = new Scanner({
  thresholds: {
    warning: 15,
    critical: 40,
  },
});

// Create supporting modules
const stats = new StatsCollector({
  thresholds: { warning: 15, critical: 40 },
});
const chain = new ChainAnalyzer({ windowSize: 100 });
const fixer = new FixSuggester();

// Track renders
scanner.on('render', (info: RenderInfo) => {
  console.log(
    `[${new Date().toISOString()}] ${info.componentName} ` +
      `rendered in ${info.renderTime.toFixed(2)}ms ` +
      `(${info.necessary ? 'necessary' : 'UNNECESSARY'})`
  );

  // Collect statistics
  stats.addRender(info);

  // Track for chain analysis
  chain.addRender(info);
});

// Track render chains
scanner.on('chain', (chainInfo) => {
  console.log(`\nRender Chain Detected:`);
  console.log(`  Trigger: ${chainInfo.trigger}`);
  console.log(`  Chain: ${chainInfo.chain.join(' -> ')}`);
  console.log(`  Depth: ${chainInfo.depth}`);
});

// Track FPS drops
scanner.on('fps-drop', (fps: number) => {
  console.log(`\nFPS dropped to ${fps.toFixed(1)}`);
});

// Scan started
scanner.on('start', () => {
  console.log('Scanner started');
});

// Scan stopped
scanner.on('stop', () => {
  console.log('Scanner stopped');

  // Get final statistics
  const componentStats = stats.getComponentStats();
  console.log(`\n=== Final Statistics ===`);
  console.log(`Components tracked: ${componentStats.length}`);

  // Get render chains
  const chains = chain.getChains();
  console.log(`Render chains detected: ${chains.length}`);

  // Get fix suggestions
  const suggestions = fixer.analyze(componentStats);
  console.log(`Fix suggestions: ${suggestions.length}`);

  if (suggestions.length > 0) {
    console.log('\n=== Top Suggestions ===');
    for (const suggestion of suggestions.slice(0, 5)) {
      console.log(`\n${suggestion.componentName}: ${suggestion.fix}`);
      console.log(`  Issue: ${suggestion.issue}`);
      console.log(`  Cause: ${suggestion.cause}`);
    }
  }
});

// Start the scanner
console.log('Starting ReactCheck scanner...');
console.log('Press Ctrl+C to stop and see results.\n');

scanner.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  scanner.stop();
  process.exit(0);
});
