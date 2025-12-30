import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TerminalWindow, IDEWindow } from '@/components/code';
import {
  ArrowRight,
  Search,
  Wrench,
  BarChart3,
  Terminal,
  GitBranch,
  CheckCircle2,
  XCircle,
  Sparkles,
  Code2,
  Cpu,
  Eye,
} from 'lucide-react';

const terminalLines = [
  { type: 'command' as const, text: 'npx @oxog/react-check localhost:3000' },
  { type: 'empty' as const, text: '' },
  { type: 'output' as const, text: '<span style="color: #3b82f6;">ReactCheck v1.0.0</span>' },
  { type: 'output' as const, text: 'Starting browser...' },
  { type: 'output' as const, text: '<span style="color: #22c55e;">✓</span> Connected to localhost:3000' },
  { type: 'output' as const, text: '<span style="color: #22c55e;">✓</span> React 18.2.0 detected' },
  { type: 'output' as const, text: '<span style="color: #22c55e;">✓</span> Scanner injected' },
  { type: 'empty' as const, text: '' },
  { type: 'output' as const, text: '<span style="color: #eab308;">Scanning...</span> Press q to stop' },
  { type: 'empty' as const, text: '' },
  { type: 'output' as const, text: '┌─ <span style="color: #3b82f6;">ReactCheck</span> ──────────────────────────────────────┐' },
  { type: 'output' as const, text: '│ Target: localhost:3000 | Session: 0m 12s | FPS: 58   │' },
  { type: 'output' as const, text: '├─────────────────────────────────────────────────────┤' },
  { type: 'output' as const, text: '│ <span style="color: #ef4444;">CRITICAL (2)</span>                                        │' },
  { type: 'output' as const, text: '│ ├── ProductCard       <span style="color: #ef4444;">127 renders</span>  (expected: 12)  │' },
  { type: 'output' as const, text: '│ └── SearchInput        <span style="color: #ef4444;">89 renders</span>  (debounce)      │' },
  { type: 'output' as const, text: '│                                                     │' },
  { type: 'output' as const, text: '│ <span style="color: #eab308;">WARNING (5)</span>                                         │' },
  { type: 'output' as const, text: '│ ├── Header             <span style="color: #eab308;">23 renders</span>                  │' },
  { type: 'output' as const, text: '│ └── ... 4 more                                      │' },
  { type: 'output' as const, text: '│                                                     │' },
  { type: 'output' as const, text: '│ <span style="color: #22c55e;">HEALTHY (36)</span>                                        │' },
  { type: 'output' as const, text: '│ └── 36 components performing well                   │' },
  { type: 'output' as const, text: '└─────────────────────────────────────────────────────┘' },
];

const features = [
  {
    icon: Eye,
    title: 'Real-time Monitoring',
    description: 'Watch component renders as they happen with an interactive TUI dashboard.',
  },
  {
    icon: Search,
    title: 'Deep Analysis',
    description: 'Detect render chains, cascading updates, and identify root causes.',
  },
  {
    icon: Wrench,
    title: 'Actionable Fixes',
    description: 'Get copy-paste code snippets to fix issues immediately.',
  },
  {
    icon: Cpu,
    title: 'Zero Config',
    description: 'Works with any React app. No code changes or setup required.',
  },
  {
    icon: BarChart3,
    title: 'CI/CD Ready',
    description: 'Generate JSON/HTML reports and fail builds on performance regressions.',
  },
  {
    icon: Code2,
    title: 'Programmatic API',
    description: 'Integrate into your test suite and build tools with the Node.js API.',
  },
];

const beforeAfterCode = {
  before: `function ProductCard({ product, onAddToCart }) {
  // Re-renders on EVERY parent render
  return (
    <div className="product-card">
      <img src={product.image} />
      <h3>{product.name}</h3>
      <p>\${product.price}</p>
      <button onClick={() => onAddToCart(product)}>
        Add to Cart
      </button>
    </div>
  );
}`,
  after: `import { memo } from 'react';

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart
}) {
  // Only re-renders when props change
  return (
    <div className="product-card">
      <img src={product.image} />
      <h3>{product.name}</h3>
      <p>\${product.price}</p>
      <button onClick={() => onAddToCart(product)}>
        Add to Cart
      </button>
    </div>
  );
});`,
};

const comparisonData = [
  { feature: 'Zero dependencies', reactcheck: true, others: false },
  { feature: 'CLI with interactive TUI', reactcheck: true, others: false },
  { feature: 'Actionable fix suggestions', reactcheck: true, others: false },
  { feature: 'Render chain detection', reactcheck: true, others: false },
  { feature: 'CI/CD integration', reactcheck: true, others: true },
  { feature: 'Works without code changes', reactcheck: true, others: false },
  { feature: 'Programmatic API', reactcheck: true, others: true },
];

export function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Background grid */}
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                Zero dependencies • MIT License
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Find and fix{' '}
                <span className="gradient-text">React performance</span>{' '}
                issues
              </h1>

              <p className="text-xl text-muted-foreground mb-8 max-w-lg">
                Scan any React app, detect unnecessary re-renders, and get actionable fix suggestions with ready-to-use code.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/docs">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    navigator.clipboard.writeText('npx @oxog/react-check localhost:3000');
                  }}
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  npx @oxog/react-check
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-healthy" />
                  No config needed
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-healthy" />
                  Works with any framework
                </div>
              </div>
            </motion.div>

            {/* Right side - Terminal */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <TerminalWindow
                lines={terminalLines}
                title="Terminal — ReactCheck"
                autoPlay={true}
                loop={true}
                typingSpeed={25}
                className="shadow-2xl glow-primary"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to optimize React
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From detection to fix, ReactCheck gives you the complete toolkit for React performance optimization.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">How it Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Three steps to faster React
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Scan',
                description: 'Point ReactCheck at your app and interact normally. It monitors every component render.',
                code: 'npx @oxog/react-check localhost:3000',
              },
              {
                step: '02',
                title: 'Diagnose',
                description: 'See which components re-render excessively and understand the render chains.',
                code: 'ProductCard: 127 renders (expected: 12)',
              },
              {
                step: '03',
                title: 'Fix',
                description: 'Get specific, copy-paste code fixes for each performance issue found.',
                code: 'const ProductCard = memo(ProductCard);',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-primary/10 absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative pt-8">
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground mb-4">{item.description}</p>
                  <code className="block px-4 py-2 bg-card rounded-lg text-sm font-mono text-primary border border-border">
                    {item.code}
                  </code>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After Code Section */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Fix Suggestions</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              From problem to solution in seconds
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              ReactCheck doesn't just find problems—it shows you exactly how to fix them with ready-to-use code.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="critical">Before</Badge>
                <span className="text-sm text-muted-foreground">127 renders detected</span>
              </div>
              <IDEWindow
                files={[{
                  name: 'ProductCard.tsx',
                  language: 'typescript',
                  code: beforeAfterCode.before,
                }]}
                title="VS Code — ProductCard.tsx"
                highlightLines={[1, 2]}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="healthy">After</Badge>
                <span className="text-sm text-muted-foreground">12 renders (optimized)</span>
              </div>
              <IDEWindow
                files={[{
                  name: 'ProductCard.tsx',
                  language: 'typescript',
                  code: beforeAfterCode.after,
                }]}
                title="VS Code — ProductCard.tsx"
                highlightLines={[1, 3]}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Comparison</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why choose ReactCheck?
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-card">
                    <th className="px-6 py-4 text-left text-sm font-semibold">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-primary">ReactCheck</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-muted-foreground">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <tr key={row.feature} className={index % 2 === 0 ? 'bg-background' : 'bg-card/50'}>
                      <td className="px-6 py-4 text-sm">{row.feature}</td>
                      <td className="px-6 py-4 text-center">
                        {row.reactcheck ? (
                          <CheckCircle2 className="w-5 h-5 text-healthy mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-critical mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.others ? (
                          <CheckCircle2 className="w-5 h-5 text-muted-foreground mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-critical/50 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to speed up your React app?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Start finding and fixing performance issues in under a minute. No signup required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/docs">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a
                href="https://github.com/ersinkoc/react-check"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg">
                  <GitBranch className="w-4 h-4 mr-2" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
