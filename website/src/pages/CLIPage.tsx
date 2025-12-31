import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { DocsSidebar, type SidebarSection } from '@/components/layout';
import { CodeBlock } from '@/components/code';
import { Terminal, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const sidebarSections: SidebarSection[] = [
  {
    title: 'Commands',
    items: [
      { name: 'Overview', href: '#overview' },
      { name: 'scan', href: '#scan' },
      { name: 'watch', href: '#watch' },
      { name: 'analyze', href: '#analyze' },
      { name: 'report', href: '#report' },
    ],
  },
  {
    title: 'Options',
    items: [
      { name: 'Global Options', href: '#global-options' },
      { name: 'Output Formats', href: '#output-formats' },
      { name: 'Filtering', href: '#filtering' },
      { name: 'Thresholds', href: '#thresholds' },
      { name: 'WebUI Dashboard', href: '#webui' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { name: 'CI Integration', href: '#ci-integration' },
      { name: 'Exit Codes', href: '#exit-codes' },
    ],
  },
];

const optionsTable = [
  { flag: '--duration, -d', default: '30', description: 'Scan duration in seconds (0 for infinite)' },
  { flag: '--threshold, -t', default: '10', description: 'Minimum renders to flag as warning' },
  { flag: '--critical, -c', default: '50', description: 'Minimum renders to flag as critical' },
  { flag: '--include, -i', default: '*', description: 'Component patterns to include' },
  { flag: '--exclude, -e', default: '-', description: 'Component patterns to exclude' },
  { flag: '--headless', default: 'false', description: 'Run browser in headless mode' },
  { flag: '--no-tui', default: 'false', description: 'Disable interactive TUI' },
  { flag: '--webui, -W', default: 'false', description: 'Enable WebUI dashboard in browser' },
  { flag: '--webui-port', default: '3100', description: 'WebUI dashboard port' },
  { flag: '--viewport, -v', default: '1280x720', description: 'Browser viewport size' },
];

const exitCodes = [
  { code: '0', color: 'text-healthy', meaning: 'Success - No critical issues found' },
  { code: '1', color: 'text-warning', meaning: 'Critical issues found (with --fail-on-critical)' },
  { code: '2', color: 'text-critical', meaning: 'Error - Could not connect to target URL' },
  { code: '3', color: 'text-critical', meaning: 'Error - React not detected on page' },
  { code: '4', color: 'text-critical', meaning: 'Error - Invalid configuration' },
];

export function CLIPage() {
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
                <Terminal className="w-3 h-3 mr-1" />
                CLI Reference
              </Badge>
              <h1 className="text-4xl font-bold mb-4">Command Line Interface</h1>
              <p className="text-xl text-muted-foreground">
                Complete reference for all ReactCheck CLI commands, options, and flags.
              </p>
            </motion.div>

            {/* Overview */}
            <section id="overview" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <CodeBlock
                code={`npx @oxog/react-check [command] [options] <url>

# Or if installed globally
react-check [command] [options] <url>`}
                language="bash"
                filename="Basic Usage"
                showLineNumbers={false}
              />

              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  <strong className="text-primary">Tip:</strong> You can also use <code className="px-1 bg-card rounded">reactcheck</code> as an alias for <code className="px-1 bg-card rounded">react-check</code>.
                </p>
              </div>
            </section>

            {/* Scan Command */}
            <section id="scan" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="text-healthy">$</span> scan
              </h2>
              <p className="text-muted-foreground mb-6">
                The default command. Scans a React application with an interactive TUI dashboard.
              </p>

              <CodeBlock
                code={`# Basic scan
npx @oxog/react-check scan http://localhost:3000

# Scan is the default command, so this also works:
npx @oxog/react-check http://localhost:3000

# With options
npx @oxog/react-check scan --duration 60 --threshold 20 http://localhost:3000

# With WebUI dashboard (opens in browser)
npx @oxog/react-check scan --webui http://localhost:3000

# WebUI with custom port
npx @oxog/react-check scan --webui --webui-port 8080 http://localhost:3000`}
                language="bash"
                showLineNumbers={false}
              />

              <h3 className="text-lg font-semibold mt-8 mb-4">Options</h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-card">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Flag</th>
                      <th className="text-left px-4 py-3 font-semibold">Default</th>
                      <th className="text-left px-4 py-3 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optionsTable.map((row, i) => (
                      <tr key={row.flag} className={i % 2 === 0 ? 'bg-background' : 'bg-card/50'}>
                        <td className="px-4 py-3 font-mono text-primary">{row.flag}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.default}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold mt-8 mb-4">Keyboard Controls</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'q', action: 'Quit' },
                  { key: 'p', action: 'Pause/Resume' },
                  { key: 'r', action: 'Reset stats' },
                  { key: 's', action: 'Save report' },
                  { key: '↑↓', action: 'Navigate' },
                  { key: 'Enter', action: 'View details' },
                  { key: 'f', action: 'Show fixes' },
                  { key: 'c', action: 'Copy fix' },
                ].map((item) => (
                  <div key={item.key} className="p-3 rounded-lg bg-card border border-border text-center">
                    <kbd className="px-2 py-1 bg-muted rounded text-sm font-mono">{item.key}</kbd>
                    <p className="text-xs text-muted-foreground mt-2">{item.action}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Watch Command */}
            <section id="watch" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="text-healthy">$</span> watch
              </h2>
              <p className="text-muted-foreground mb-6">
                Continuously monitors your application for performance regressions. Perfect for development.
              </p>

              <CodeBlock
                code={`# Watch mode - runs indefinitely
npx @oxog/react-check watch http://localhost:3000

# With threshold alerts
npx @oxog/react-check watch --alert-threshold 100 http://localhost:3000`}
                language="bash"
                showLineNumbers={false}
              />
            </section>

            {/* Analyze Command */}
            <section id="analyze" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="text-healthy">$</span> analyze
              </h2>
              <p className="text-muted-foreground mb-6">
                Performs deep analysis on a specific component or interaction pattern.
              </p>

              <CodeBlock
                code={`# Analyze a specific component
npx @oxog/react-check analyze --component ProductCard http://localhost:3000

# Analyze with render chain tracking
npx @oxog/react-check analyze --component ProductCard --chain http://localhost:3000

# Analyze with interaction recording
npx @oxog/react-check analyze --record-interactions http://localhost:3000`}
                language="bash"
                showLineNumbers={false}
              />
            </section>

            {/* Report Command */}
            <section id="report" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="text-healthy">$</span> report
              </h2>
              <p className="text-muted-foreground mb-6">
                Generates a detailed report from a scan session. Ideal for CI/CD integration.
              </p>

              <CodeBlock
                code={`# Generate JSON report
npx @oxog/react-check report --format json --output report.json http://localhost:3000

# Generate HTML report
npx @oxog/react-check report --format html --output report.html http://localhost:3000

# Generate markdown for GitHub
npx @oxog/react-check report --format markdown http://localhost:3000 > PERFORMANCE.md`}
                language="bash"
                showLineNumbers={false}
              />
            </section>

            {/* Output Formats */}
            <section id="output-formats" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Output Formats</h2>
              <p className="text-muted-foreground mb-6">
                ReactCheck supports multiple output formats for different use cases.
              </p>

              <div className="space-y-4">
                {[
                  { name: 'JSON', desc: 'Machine-readable format for CI/CD integration', code: 'npx @oxog/react-check report --format json http://localhost:3000' },
                  { name: 'HTML', desc: 'Interactive report with charts and tables', code: 'npx @oxog/react-check report --format html -o report.html http://localhost:3000' },
                  { name: 'Markdown', desc: 'GitHub-flavored markdown for PR comments', code: 'npx @oxog/react-check report --format markdown http://localhost:3000' },
                  { name: 'CSV', desc: 'Spreadsheet-compatible format', code: 'npx @oxog/react-check report --format csv -o data.csv http://localhost:3000' },
                ].map((format) => (
                  <div key={format.name} className="p-4 rounded-lg bg-card border border-border">
                    <h4 className="font-semibold text-primary mb-1">{format.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{format.desc}</p>
                    <code className="block px-3 py-2 bg-background rounded text-xs font-mono overflow-x-auto">
                      {format.code}
                    </code>
                  </div>
                ))}
              </div>
            </section>

            {/* Filtering */}
            <section id="filtering" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Filtering Components</h2>
              <p className="text-muted-foreground mb-6">
                Use glob patterns to include or exclude specific components from analysis.
              </p>

              <CodeBlock
                code={`# Only scan components starting with "Product" or "Cart"
npx @oxog/react-check --include 'Product*,Cart*' http://localhost:3000

# Exclude common wrapper components
npx @oxog/react-check --exclude 'Provider,Context*,*Wrapper' http://localhost:3000

# Combine include and exclude
npx @oxog/react-check --include 'Page*' --exclude '*Layout' http://localhost:3000`}
                language="bash"
                showLineNumbers={false}
              />

              <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-sm">
                  <strong className="text-warning">Note:</strong> Patterns use glob syntax. <code className="px-1 bg-card rounded">*</code> matches any characters, <code className="px-1 bg-card rounded">?</code> matches a single character.
                </p>
              </div>
            </section>

            {/* WebUI Dashboard */}
            <section id="webui" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">WebUI Dashboard</h2>
              <p className="text-muted-foreground mb-6">
                ReactCheck includes a real-time web dashboard that opens in your browser. Use it alongside or instead of the TUI.
              </p>

              <CodeBlock
                code={`# Enable WebUI dashboard (opens automatically in browser)
npx @oxog/react-check scan --webui http://localhost:3000

# Custom WebUI port
npx @oxog/react-check scan --webui --webui-port 8080 http://localhost:3000

# WebUI only (disable TUI)
npx @oxog/react-check scan --webui --silent http://localhost:3000`}
                language="bash"
                showLineNumbers={false}
              />

              <h3 className="text-lg font-semibold mt-8 mb-4">WebUI Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: 'Live Summary', desc: 'Real-time component, render, and FPS counts' },
                  { title: 'Component Table', desc: 'Sortable and filterable component list' },
                  { title: 'Render Events', desc: 'Live stream of render events as they occur' },
                  { title: 'Render Chains', desc: 'Visualization of cascade render chains' },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-lg bg-card border border-border">
                    <h4 className="font-semibold text-primary mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  <strong className="text-primary">Tip:</strong> The WebUI dashboard auto-opens in your default browser. You can run both TUI and WebUI simultaneously for the best of both worlds.
                </p>
              </div>
            </section>

            {/* CI Integration */}
            <section id="ci-integration" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">CI/CD Integration</h2>
              <p className="text-muted-foreground mb-6">
                ReactCheck can fail CI builds when performance issues are detected.
              </p>

              <CodeBlock
                code={`name: Performance Check

on: [pull_request]

jobs:
  reactcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build
      - run: npm run preview &
      - run: npx wait-on http://localhost:4173

      - name: Run ReactCheck
        run: |
          npx @oxog/react-check report \\
            --format markdown \\
            --headless \\
            --fail-on-critical \\
            http://localhost:4173`}
                language="yaml"
                filename=".github/workflows/performance.yml"
              />
            </section>

            {/* Exit Codes */}
            <section id="exit-codes" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Exit Codes</h2>
              <p className="text-muted-foreground mb-6">
                ReactCheck uses standard exit codes for CI/CD integration.
              </p>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-card">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold w-20">Code</th>
                      <th className="text-left px-4 py-3 font-semibold">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exitCodes.map((row, i) => (
                      <tr key={row.code} className={i % 2 === 0 ? 'bg-background' : 'bg-card/50'}>
                        <td className={`px-4 py-3 font-mono font-bold ${row.color}`}>{row.code}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8 border-t border-border">
              <Link to="/docs" className="text-primary hover:underline flex items-center gap-1">
                ← Getting Started
              </Link>
              <Link to="/api" className="text-primary hover:underline flex items-center gap-1">
                API Reference <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
