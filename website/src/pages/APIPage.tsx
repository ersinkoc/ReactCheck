import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { DocsSidebar, type SidebarSection } from '@/components/layout';
import { CodeBlock, IDEWindow } from '@/components/code';
import { Code2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const sidebarSections: SidebarSection[] = [
  {
    title: 'Getting Started',
    items: [
      { name: 'Installation', href: '#installation' },
      { name: 'Quick Start', href: '#quick-start' },
    ],
  },
  {
    title: 'Core API',
    items: [
      { name: 'createScanner()', href: '#create-scanner' },
      { name: 'Scanner Methods', href: '#scanner-methods' },
      { name: 'Scanner Events', href: '#scanner-events' },
    ],
  },
  {
    title: 'Types',
    items: [
      { name: 'RenderData', href: '#render-data' },
      { name: 'RenderChain', href: '#render-chain' },
      { name: 'FixSuggestion', href: '#fix-suggestion' },
    ],
  },
  {
    title: 'Utilities',
    items: [
      { name: 'generateReport()', href: '#generate-report' },
      { name: 'suggestFixes()', href: '#suggest-fixes' },
    ],
  },
];

const quickStartCode = `import { createScanner } from '@oxog/react-check';

const scanner = await createScanner({
  url: 'http://localhost:3000',
  headless: true
});

// Start scanning
await scanner.start();

// Listen for render events
scanner.on('render', (data) => {
  console.log(\`\${data.component}: \${data.count} renders\`);
});

// Stop after 30 seconds
setTimeout(async () => {
  const results = await scanner.stop();
  console.log(results);
}, 30000);`;

const scannerOptionsCode = `interface ScannerOptions {
  // Required
  url: string;                    // Target URL to scan

  // Browser options
  headless?: boolean;             // Run browser headless (default: false)
  viewport?: {
    width: number;
    height: number;
  };                              // Browser viewport (default: 1280x720)

  // Scan options
  threshold?: number;             // Warning threshold (default: 10)
  critical?: number;              // Critical threshold (default: 50)
  include?: string[];             // Component patterns to include
  exclude?: string[];             // Component patterns to exclude

  // Advanced
  puppeteer?: PuppeteerLaunchOptions;  // Custom Puppeteer options
}`;

const renderDataCode = `interface RenderData {
  component: string;           // Component name
  count: number;               // Total render count
  timestamps: number[];        // Render timestamps
  averageInterval: number;     // Average ms between renders
  minInterval: number;         // Minimum ms between renders
  maxInterval: number;         // Maximum ms between renders
  severity: 'healthy' | 'warning' | 'critical';
  props?: {
    changed: string[];         // Props that changed
    stable: string[];          // Props that didn't change
  };
  parent?: string;             // Parent component name
  children?: string[];         // Child component names
}`;

const renderChainCode = `interface RenderChain {
  id: string;                  // Unique chain ID
  root: string;                // Root component that started chain
  chain: ChainNode[];          // Ordered list of renders
  totalTime: number;           // Total chain duration in ms
  timestamp: number;           // When chain started
}

interface ChainNode {
  component: string;
  depth: number;               // Depth in component tree
  time: number;                // Time since chain started
  cause?: 'props' | 'state' | 'context';
}`;

const fixSuggestionCode = `interface FixSuggestion {
  type: FixType;               // Type of fix
  component: string;           // Target component
  description: string;         // Human-readable description
  code: string;                // Code snippet to apply
  impact: 'high' | 'medium' | 'low';
  confidence: number;          // 0-1 confidence score
}

type FixType =
  | 'memo'                     // Wrap with React.memo
  | 'useMemo'                  // Memoize value
  | 'useCallback'              // Memoize callback
  | 'state-split'              // Split state atoms
  | 'context-split'            // Split context
  | 'virtualization'           // Add list virtualization
  | 'debounce'                 // Debounce updates
  | 'lazy'                     // Lazy load component
  | 'key-fix';                 // Fix list keys`;

const fullExampleCode = `import {
  createScanner,
  generateReport,
  suggestFixes,
  analyzeChains
} from '@oxog/react-check';
import fs from 'fs/promises';

async function runPerformanceTest() {
  // Create scanner
  const scanner = await createScanner({
    url: 'http://localhost:3000',
    headless: true,
    threshold: 10,
    critical: 50
  });

  // Track issues
  const issues = [];

  // Listen for critical issues
  scanner.on('critical', (event) => {
    issues.push({
      component: event.component,
      count: event.count,
      severity: 'critical'
    });
  });

  // Start scanning
  await scanner.start();

  // Simulate user interactions
  const page = scanner.getPage();
  await page.click('[data-testid="add-to-cart"]');
  await page.waitForTimeout(1000);
  await page.type('[data-testid="search"]', 'test query');
  await page.waitForTimeout(2000);

  // Stop and get results
  const results = await scanner.stop();

  // Analyze render chains
  const chains = analyzeChains(results.renders);

  // Get fix suggestions
  const fixes = suggestFixes(results.renders);

  // Generate reports
  const jsonReport = generateReport(results, {
    format: 'json',
    includeFixes: true,
    includeChains: true
  });

  const htmlReport = generateReport(results, {
    format: 'html',
    title: 'Performance Test Results'
  });

  // Save reports
  await fs.writeFile('report.json', jsonReport);
  await fs.writeFile('report.html', htmlReport);

  // Close scanner
  await scanner.close();

  // Return summary
  return {
    totalRenders: results.totalRenders,
    criticalCount: issues.length,
    chainCount: chains.length,
    fixCount: fixes.length
  };
}

runPerformanceTest()
  .then(console.log)
  .catch(console.error);`;

export function APIPage() {
  return (
    <div className="pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          <DocsSidebar sections={sidebarSections} className="hidden lg:block" />

          <div className="flex-1 min-w-0 max-w-3xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <Badge variant="secondary" className="mb-4">
                <Code2 className="w-3 h-3 mr-1" />
                API Reference
              </Badge>
              <h1 className="text-4xl font-bold mb-4">Programmatic API</h1>
              <p className="text-xl text-muted-foreground">
                Integrate ReactCheck into your build tools, test suites, and custom workflows.
              </p>
            </motion.div>

            {/* Installation */}
            <section id="installation" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Installation</h2>
              <CodeBlock
                code="npm install @oxog/react-check"
                language="bash"
                showLineNumbers={false}
              />

              <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-sm">
                  <strong className="text-warning">Note:</strong> The API requires <code className="px-1 bg-card rounded">puppeteer</code> as a peer dependency for browser automation.
                </p>
              </div>
            </section>

            {/* Quick Start */}
            <section id="quick-start" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
              <IDEWindow
                files={[{
                  name: 'scan.ts',
                  language: 'typescript',
                  code: quickStartCode,
                }]}
                title="VS Code — scan.ts"
              />
            </section>

            {/* createScanner */}
            <section id="create-scanner" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">createScanner(options)</h2>
              <p className="text-muted-foreground mb-6">
                Creates a new scanner instance for monitoring React component renders.
              </p>

              <h3 className="text-lg font-semibold mb-4">Parameters</h3>
              <CodeBlock
                code={scannerOptionsCode}
                language="typescript"
                filename="ScannerOptions"
              />

              <h3 className="text-lg font-semibold mt-8 mb-4">Example</h3>
              <CodeBlock
                code={`const scanner = await createScanner({
  url: 'http://localhost:3000',
  headless: true,
  viewport: { width: 1920, height: 1080 },
  threshold: 5,
  critical: 25,
  include: ['Product*', 'Cart*'],
  exclude: ['*Provider', '*Context']
});`}
                language="typescript"
                showLineNumbers={false}
              />
            </section>

            {/* Scanner Methods */}
            <section id="scanner-methods" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Scanner Methods</h2>

              <div className="space-y-6">
                {[
                  { name: 'scanner.start()', desc: 'Starts scanning for React component renders.', code: 'await scanner.start();' },
                  { name: 'scanner.stop()', desc: 'Stops scanning and returns aggregated results.', code: 'const results = await scanner.stop();' },
                  { name: 'scanner.pause() / resume()', desc: 'Temporarily pause and resume scanning.', code: 'scanner.pause();\n// ... do something ...\nscanner.resume();' },
                  { name: 'scanner.reset()', desc: 'Resets all collected data while keeping scanner active.', code: 'scanner.reset();' },
                  { name: 'scanner.getStats()', desc: 'Returns current statistics without stopping.', code: 'const stats = scanner.getStats();' },
                  { name: 'scanner.navigate(url)', desc: 'Navigate to a different URL while scanning.', code: "await scanner.navigate('/products');" },
                  { name: 'scanner.close()', desc: 'Closes the browser and cleans up resources.', code: 'await scanner.close();' },
                ].map((method) => (
                  <div key={method.name} className="p-4 rounded-lg bg-card border border-border">
                    <h4 className="font-semibold text-primary font-mono mb-2">{method.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{method.desc}</p>
                    <code className="block px-3 py-2 bg-background rounded text-xs font-mono whitespace-pre">
                      {method.code}
                    </code>
                  </div>
                ))}
              </div>
            </section>

            {/* Scanner Events */}
            <section id="scanner-events" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Scanner Events</h2>
              <p className="text-muted-foreground mb-6">
                Subscribe to events using <code className="px-1 bg-card rounded">scanner.on(event, callback)</code>.
              </p>

              <div className="rounded-lg border border-border overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-card">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Event</th>
                      <th className="text-left px-4 py-3 font-semibold">Payload</th>
                      <th className="text-left px-4 py-3 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { event: 'render', payload: 'RenderEvent', desc: 'Fired for each component render' },
                      { event: 'warning', payload: 'WarningEvent', desc: 'Component exceeded warning threshold' },
                      { event: 'critical', payload: 'CriticalEvent', desc: 'Component exceeded critical threshold' },
                      { event: 'chain', payload: 'ChainEvent', desc: 'Render chain detected' },
                      { event: 'error', payload: 'Error', desc: 'Scanner error occurred' },
                    ].map((row, i) => (
                      <tr key={row.event} className={i % 2 === 0 ? 'bg-background' : 'bg-card/50'}>
                        <td className="px-4 py-3 font-mono text-primary">{row.event}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{row.payload}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <CodeBlock
                code={`scanner.on('render', (event) => {
  console.log(\`\${event.component} rendered (\${event.count} total)\`);
});

scanner.on('warning', (event) => {
  console.warn(\`Warning: \${event.component} - \${event.count} renders\`);
});

scanner.on('critical', (event) => {
  console.error(\`Critical: \${event.component} - \${event.count} renders\`);
  console.log('Suggested fix:', event.fix);
});`}
                language="typescript"
                filename="Event Handling"
              />
            </section>

            {/* RenderData */}
            <section id="render-data" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">RenderData</h2>
              <p className="text-muted-foreground mb-6">
                The data structure for component render information.
              </p>
              <CodeBlock
                code={renderDataCode}
                language="typescript"
                filename="RenderData Interface"
              />
            </section>

            {/* RenderChain */}
            <section id="render-chain" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">RenderChain</h2>
              <p className="text-muted-foreground mb-6">
                Represents a cascade of renders triggered by a parent component.
              </p>
              <CodeBlock
                code={renderChainCode}
                language="typescript"
                filename="RenderChain Interface"
              />
            </section>

            {/* FixSuggestion */}
            <section id="fix-suggestion" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">FixSuggestion</h2>
              <p className="text-muted-foreground mb-6">
                Actionable fix suggestions for performance issues.
              </p>
              <CodeBlock
                code={fixSuggestionCode}
                language="typescript"
                filename="FixSuggestion Interface"
              />
            </section>

            {/* generateReport */}
            <section id="generate-report" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">generateReport(results, options)</h2>
              <p className="text-muted-foreground mb-6">
                Generates a formatted report from scan results.
              </p>
              <CodeBlock
                code={`import { generateReport } from '@oxog/react-check';

const results = await scanner.stop();

// Generate JSON report
const jsonReport = generateReport(results, { format: 'json' });

// Generate HTML report
const htmlReport = generateReport(results, {
  format: 'html',
  includeFixes: true,
  includeChains: true
});

// Generate markdown for GitHub
const mdReport = generateReport(results, {
  format: 'markdown',
  title: 'Performance Report'
});`}
                language="typescript"
              />
            </section>

            {/* Full Example */}
            <section className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Complete Example</h2>
              <p className="text-muted-foreground mb-6">
                A complete example showing scanner setup, event handling, and report generation.
              </p>
              <IDEWindow
                files={[{
                  name: 'performance-test.ts',
                  language: 'typescript',
                  code: fullExampleCode,
                }]}
                title="VS Code — performance-test.ts"
              />
            </section>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8 border-t border-border">
              <Link to="/cli" className="text-primary hover:underline flex items-center gap-1">
                ← CLI Reference
              </Link>
              <Link to="/fixes" className="text-primary hover:underline flex items-center gap-1">
                Fix Suggestions <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
