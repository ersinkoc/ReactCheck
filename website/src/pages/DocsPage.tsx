import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { DocsSidebar, type SidebarSection } from '@/components/layout';
import { TerminalWindow, CodeBlock, IDEWindow } from '@/components/code';
import { ArrowRight, BookOpen, Zap, Settings, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';

const sidebarSections: SidebarSection[] = [
  {
    title: 'Getting Started',
    items: [
      { name: 'Installation', href: '#installation' },
      { name: 'Quick Start', href: '#quick-start' },
      { name: 'Understanding Output', href: '#output' },
    ],
  },
  {
    title: 'Concepts',
    items: [
      { name: 'How It Works', href: '#how-it-works' },
      { name: 'Render Detection', href: '#render-detection' },
      { name: 'Severity Levels', href: '#severity-levels' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { name: 'Config File', href: '#config-file' },
      { name: 'Thresholds', href: '#thresholds' },
      { name: 'Filtering', href: '#filtering' },
    ],
  },
];

const quickStartTerminal = [
  { type: 'command' as const, text: 'npx @oxog/react-check localhost:3000' },
  { type: 'empty' as const, text: '' },
  { type: 'output' as const, text: '<span style="color: #3b82f6;">ReactCheck v1.0.0</span>' },
  { type: 'output' as const, text: 'Starting browser...' },
  { type: 'output' as const, text: '<span style="color: #22c55e;">✓</span> Connected to localhost:3000' },
  { type: 'output' as const, text: '<span style="color: #22c55e;">✓</span> React 18.2.0 detected' },
];

const configCode = `// reactcheck.config.js
export default {
  // Severity thresholds
  threshold: 10,      // Warning threshold
  critical: 50,       // Critical threshold

  // Scan duration (seconds, 0 for infinite)
  duration: 30,

  // Component filtering
  include: ['*'],
  exclude: ['Provider', '*Context', '*Wrapper'],

  // Browser settings
  browser: {
    headless: true,
    viewport: { width: 1280, height: 720 }
  },

  // Output settings
  output: {
    format: 'json',
    path: './reports/reactcheck.json'
  }
}`;

export function DocsPage() {
  return (
    <div className="pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          {/* Sidebar */}
          <DocsSidebar sections={sidebarSections} className="hidden lg:block" />

          {/* Content */}
          <div className="flex-1 min-w-0 max-w-3xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <Badge variant="secondary" className="mb-4">
                <BookOpen className="w-3 h-3 mr-1" />
                Documentation
              </Badge>
              <h1 className="text-4xl font-bold mb-4">Getting Started</h1>
              <p className="text-xl text-muted-foreground">
                Learn how to use ReactCheck to find and fix performance issues in your React applications.
              </p>
            </motion.div>

            {/* Installation */}
            <section id="installation" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Installation
              </h2>
              <p className="text-muted-foreground mb-6">
                ReactCheck can be used directly with npx—no installation required. For repeated use, you can install it globally or as a dev dependency.
              </p>

              <div className="space-y-4">
                <CodeBlock
                  code="npx @oxog/react-check localhost:3000"
                  language="bash"
                  filename="Using npx (recommended)"
                  showLineNumbers={false}
                />

                <CodeBlock
                  code={`# Global installation
npm install -g @oxog/react-check

# Or as a dev dependency
npm install -D @oxog/react-check`}
                  language="bash"
                  filename="Installation options"
                  showLineNumbers={false}
                />
              </div>

              <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  <strong className="text-primary">Note:</strong> ReactCheck requires Node.js 18+ and uses Puppeteer for browser automation. Puppeteer will download a browser on first run.
                </p>
              </div>
            </section>

            {/* Quick Start */}
            <section id="quick-start" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
              <p className="text-muted-foreground mb-6">
                Start your React development server, then run ReactCheck pointing to your app's URL.
              </p>

              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">1. Start your React app</p>
                  <CodeBlock
                    code="npm run dev"
                    language="bash"
                    showLineNumbers={false}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">2. Run ReactCheck in another terminal</p>
                  <TerminalWindow
                    lines={quickStartTerminal}
                    title="Terminal"
                    autoPlay={false}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">3. Interact with your app</p>
                  <p className="text-muted-foreground">
                    Use your app normally—click buttons, navigate pages, fill forms. ReactCheck monitors all component renders in real-time.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">4. View results</p>
                  <p className="text-muted-foreground">
                    Press <kbd className="px-2 py-1 bg-card rounded border border-border text-xs">q</kbd> to stop and see the full report with fix suggestions.
                  </p>
                </div>
              </div>
            </section>

            {/* Understanding Output */}
            <section id="output" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Understanding the Output</h2>
              <p className="text-muted-foreground mb-6">
                ReactCheck displays a real-time dashboard showing component render counts and severity.
              </p>

              <div className="rounded-lg border border-border overflow-hidden bg-card p-6 font-mono text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">┌─ <span className="text-primary">ReactCheck</span> ──────────────────────────────────────┐</div>
                  <div className="text-muted-foreground">│ Target: localhost:3000 | Session: 0m 12s | FPS: 58   │</div>
                  <div className="text-muted-foreground">├─────────────────────────────────────────────────────┤</div>
                  <div className="text-muted-foreground">│ <span className="text-critical">CRITICAL (2)</span>                                        │</div>
                  <div className="text-muted-foreground">│ ├── ProductCard       <span className="text-critical">127 renders</span>  (expected: 12)  │</div>
                  <div className="text-muted-foreground">│ └── SearchInput        <span className="text-critical">89 renders</span>  (debounce)      │</div>
                  <div className="text-muted-foreground">│                                                     │</div>
                  <div className="text-muted-foreground">│ <span className="text-warning">WARNING (5)</span>                                         │</div>
                  <div className="text-muted-foreground">│ ├── Header             <span className="text-warning">23 renders</span>                  │</div>
                  <div className="text-muted-foreground">│ └── ... 4 more                                      │</div>
                  <div className="text-muted-foreground">│                                                     │</div>
                  <div className="text-muted-foreground">│ <span className="text-healthy">HEALTHY (36)</span>                                        │</div>
                  <div className="text-muted-foreground">│ └── 36 components performing well                   │</div>
                  <div className="text-muted-foreground">└─────────────────────────────────────────────────────┘</div>
                </div>
              </div>

              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-critical/10 border border-critical/20">
                  <Badge variant="critical" className="mb-2">Critical</Badge>
                  <p className="text-sm text-muted-foreground">
                    Renders exceed critical threshold. Immediate action recommended.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <Badge variant="warning" className="mb-2">Warning</Badge>
                  <p className="text-sm text-muted-foreground">
                    Renders above normal but below critical. Review when possible.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-healthy/10 border border-healthy/20">
                  <Badge variant="healthy" className="mb-2">Healthy</Badge>
                  <p className="text-sm text-muted-foreground">
                    Component is performing well within expected parameters.
                  </p>
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-primary" />
                How It Works
              </h2>
              <p className="text-muted-foreground mb-6">
                ReactCheck uses Puppeteer to launch a browser and inject a monitoring script into your React application.
              </p>

              <ol className="space-y-4">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                  <div>
                    <h4 className="font-semibold">Browser Launch</h4>
                    <p className="text-muted-foreground">ReactCheck launches a Chromium browser and navigates to your app.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                  <div>
                    <h4 className="font-semibold">React Detection</h4>
                    <p className="text-muted-foreground">It detects React's presence and version using DevTools hooks.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                  <div>
                    <h4 className="font-semibold">Render Monitoring</h4>
                    <p className="text-muted-foreground">A lightweight script hooks into React's reconciler to track every component render.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
                  <div>
                    <h4 className="font-semibold">Analysis</h4>
                    <p className="text-muted-foreground">Render data is analyzed to detect patterns, chains, and suggest fixes.</p>
                  </div>
                </li>
              </ol>
            </section>

            {/* Config File */}
            <section id="config-file" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary" />
                Configuration
              </h2>
              <p className="text-muted-foreground mb-6">
                Create a <code className="px-2 py-1 bg-card rounded border border-border text-sm">reactcheck.config.js</code> file in your project root for persistent configuration.
              </p>

              <IDEWindow
                files={[{
                  name: 'reactcheck.config.js',
                  language: 'javascript',
                  code: configCode,
                }]}
                title="VS Code — reactcheck.config.js"
              />
            </section>

            {/* Severity Levels */}
            <section id="severity-levels" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4">Severity Levels</h2>
              <p className="text-muted-foreground mb-6">
                Configure thresholds to match your application's performance requirements.
              </p>

              <CodeBlock
                code={`# Strict thresholds for performance-critical apps
npx @oxog/react-check --threshold 5 --critical 25 localhost:3000

# Relaxed thresholds for dashboard apps
npx @oxog/react-check --threshold 50 --critical 200 localhost:3000`}
                language="bash"
                showLineNumbers={false}
              />
            </section>

            {/* Next Steps */}
            <section className="mt-16 p-6 rounded-xl bg-card border border-border">
              <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link
                  to="/cli"
                  className="p-4 rounded-lg bg-background hover:bg-muted transition-colors group"
                >
                  <h4 className="font-medium mb-1 group-hover:text-primary transition-colors">
                    CLI Reference
                    <ArrowRight className="inline w-4 h-4 ml-1" />
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    All commands, flags, and options.
                  </p>
                </Link>
                <Link
                  to="/api"
                  className="p-4 rounded-lg bg-background hover:bg-muted transition-colors group"
                >
                  <h4 className="font-medium mb-1 group-hover:text-primary transition-colors">
                    API Reference
                    <ArrowRight className="inline w-4 h-4 ml-1" />
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Programmatic usage in Node.js.
                  </p>
                </Link>
                <Link
                  to="/fixes"
                  className="p-4 rounded-lg bg-background hover:bg-muted transition-colors group"
                >
                  <h4 className="font-medium mb-1 group-hover:text-primary transition-colors">
                    Fix Suggestions
                    <ArrowRight className="inline w-4 h-4 ml-1" />
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    All fix types explained with examples.
                  </p>
                </Link>
                <Link
                  to="/examples"
                  className="p-4 rounded-lg bg-background hover:bg-muted transition-colors group"
                >
                  <h4 className="font-medium mb-1 group-hover:text-primary transition-colors">
                    Examples
                    <ArrowRight className="inline w-4 h-4 ml-1" />
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Framework and CI/CD integration.
                  </p>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
