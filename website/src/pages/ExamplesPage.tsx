import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { DocsSidebar, type SidebarSection } from '@/components/layout';
import { CodeBlock, IDEWindow } from '@/components/code';
import { Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const sidebarSections: SidebarSection[] = [
  {
    title: 'Frameworks',
    items: [
      { name: 'Next.js', href: '#nextjs' },
      { name: 'Remix', href: '#remix' },
      { name: 'Vite', href: '#vite' },
    ],
  },
  {
    title: 'CI/CD',
    items: [
      { name: 'GitHub Actions', href: '#github-actions' },
      { name: 'GitLab CI', href: '#gitlab-ci' },
    ],
  },
  {
    title: 'Testing',
    items: [
      { name: 'Vitest', href: '#vitest' },
      { name: 'Playwright', href: '#playwright' },
    ],
  },
];

const nextjsCode = `import { createScanner } from '@oxog/react-check';

async function testNextJsPerformance() {
  const scanner = await createScanner({
    url: 'http://localhost:3000',
    headless: true,
    threshold: 10,
    critical: 50,
    // Exclude Next.js internal components
    exclude: ['NextRouter', 'RouterContext', 'Head*']
  });

  await scanner.start();

  // Navigate through pages
  const page = scanner.getPage();
  await page.goto('http://localhost:3000/products');
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3000/cart');
  await page.waitForTimeout(2000);

  const results = await scanner.stop();
  await scanner.close();

  // Fail if critical issues found
  const criticalCount = results.components.filter(
    c => c.severity === 'critical'
  ).length;

  if (criticalCount > 0) {
    console.error(\`Found \${criticalCount} critical issues\`);
    process.exit(1);
  }

  console.log('Performance check passed!');
}

testNextJsPerformance();`;

const githubActionsCode = `name: Performance Check

on:
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start preview server
        run: npm run preview &

      - name: Wait for server
        run: npx wait-on http://localhost:4173 --timeout 60000

      - name: Run ReactCheck
        id: reactcheck
        run: |
          npx @oxog/react-check report \\
            --format markdown \\
            --headless \\
            --duration 30 \\
            --fail-on-critical \\
            http://localhost:4173 > report.md
        continue-on-error: true

      - name: Comment on PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('report.md', 'utf8');

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number
            });

            const botComment = comments.find(c =>
              c.user.type === 'Bot' &&
              c.body.includes('ReactCheck Performance Report')
            );

            const body = \`## ReactCheck Performance Report\\n\\n\${report}\`;

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body
              });
            }

      - name: Check result
        if: steps.reactcheck.outcome == 'failure'
        run: exit 1`;

const vitestCode = `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createScanner, type Scanner, type ScanResults } from '@oxog/react-check';
import { preview } from 'vite';

describe('Performance Tests', () => {
  let server: any;
  let scanner: Scanner;
  let results: ScanResults;

  beforeAll(async () => {
    // Start preview server
    server = await preview({
      preview: { port: 4173, strictPort: true }
    });

    // Create and run scanner
    scanner = await createScanner({
      url: 'http://localhost:4173',
      headless: true,
      threshold: 10,
      critical: 50
    });

    await scanner.start();

    // Interact with app
    const page = scanner.getPage();
    await page.click('[data-testid="nav-products"]');
    await page.waitForTimeout(1000);

    results = await scanner.stop();
  }, 60000);

  afterAll(async () => {
    await scanner.close();
    await server.close();
  });

  it('should have no critical performance issues', () => {
    const critical = results.components.filter(
      c => c.severity === 'critical'
    );
    expect(critical).toHaveLength(0);
  });

  it('should keep total renders under threshold', () => {
    expect(results.totalRenders).toBeLessThan(500);
  });

  it('should not have excessive re-renders on ProductCard', () => {
    const productCard = results.components.find(
      c => c.component === 'ProductCard'
    );
    expect(productCard?.count ?? 0).toBeLessThan(20);
  });
});`;

const playwrightCode = `import { test, expect } from '@playwright/test';
import { createScanner, generateReport } from '@oxog/react-check';

test.describe('Performance', () => {
  test('should pass performance requirements', async ({ page }) => {
    const scanner = await createScanner({
      url: 'http://localhost:3000',
      headless: true,
      puppeteer: { page }
    });

    await scanner.start();

    // Use Playwright's powerful selectors
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('Search...').fill('react');
    await page.waitForTimeout(500);

    await page.getByTestId('product-card').first().click();
    await page.waitForLoadState('networkidle');

    const results = await scanner.stop();

    // Generate report for artifacts
    const report = generateReport(results, { format: 'html' });
    await page.evaluate((html) => {
      document.body.innerHTML = html;
    }, report);
    await page.screenshot({
      path: 'test-results/performance.png',
      fullPage: true
    });

    // Assertions
    const criticalCount = results.components.filter(
      c => c.severity === 'critical'
    ).length;

    expect(criticalCount).toBe(0);
    expect(results.totalRenders).toBeLessThan(200);
  });
});`;

const gitlabCICode = `stages:
  - build
  - test
  - performance

performance:
  stage: performance
  image: node:20
  services:
    - name: browserless/chrome:latest
      alias: chrome
  variables:
    PUPPETEER_EXECUTABLE_PATH: /usr/bin/google-chrome-stable
  before_script:
    - apt-get update && apt-get install -y chromium
    - npm ci
  script:
    - npm run build
    - npm run preview &
    - npx wait-on http://localhost:4173
    - |
      npx @oxog/react-check report \\
        --format json \\
        --headless \\
        --duration 30 \\
        -o performance-report.json \\
        http://localhost:4173
  artifacts:
    paths:
      - performance-report.json
    reports:
      performance: performance-report.json
  only:
    - merge_requests
    - main`;

export function ExamplesPage() {
  return (
    <div className="pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          <DocsSidebar sections={sidebarSections} className="hidden lg:block" />

          <div className="flex-1 min-w-0 max-w-4xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <Badge variant="secondary" className="mb-4">
                <Layers className="w-3 h-3 mr-1" />
                Examples
              </Badge>
              <h1 className="text-4xl font-bold mb-4">Integration Examples</h1>
              <p className="text-xl text-muted-foreground">
                Real-world integration examples for popular frameworks, CI/CD systems, and testing tools.
              </p>
            </motion.div>

            {/* Next.js */}
            <section id="nextjs" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 180 180" fill="none">
                  <mask id="a" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">
                    <circle cx="90" cy="90" r="90" fill="#000"/>
                  </mask>
                  <g mask="url(#a)">
                    <circle cx="90" cy="90" r="90" fill="currentColor"/>
                    <path d="M149.508 157.52L69.142 54H54v71.97h12.114V69.384l73.885 95.461a90.304 90.304 0 009.509-7.325z" fill="url(#b)"/>
                    <rect x="115" y="54" width="12" height="72" fill="url(#c)"/>
                  </g>
                  <defs>
                    <linearGradient id="b" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#fff"/>
                      <stop offset="1" stopColor="#fff" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="c" x1="121" y1="54" x2="120.799" y2="106.875" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#fff"/>
                      <stop offset="1" stopColor="#fff" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
                Next.js
              </h2>
              <p className="text-muted-foreground mb-6">
                Scan your Next.js application during development or in your CI pipeline.
              </p>

              <CodeBlock
                code={`{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "perf": "npm run dev & sleep 5 && npx @oxog/react-check http://localhost:3000"
  }
}`}
                language="json"
                filename="package.json"
              />

              <div className="mt-6">
                <IDEWindow
                  files={[{
                    name: 'scripts/perf-test.ts',
                    language: 'typescript',
                    code: nextjsCode,
                  }]}
                  title="VS Code — scripts/perf-test.ts"
                />
              </div>
            </section>

            {/* Remix */}
            <section id="remix" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 800 800" fill="currentColor">
                  <path d="M587.947 527.768c4.239 65.903-4.327 102.679-14.058 122.398H419.973c0-20.212 0-42.241.542-66.057.749-32.823-2.669-72.671-17.675-102.547-15.006-29.876-41.347-49.595-85.372-59.138l-.032-.01c-.07-.016-16.143-3.632-37.856-3.632H135.845v-.013H133V289.873h159.393c49.608 0 85.013-4.206 110.637-20.205 25.624-15.999 38.64-43.207 38.64-82.626 0-35.209-12.458-60.282-35.876-77.588C382.376 92.146 348.992 82 303.46 82H133V0h195.234c89.971 0 154.797 20.575 197.715 59.138 42.918 38.563 65.033 95.627 65.033 168.063 0 59.727-15.478 107.177-46.434 142.349-21.906 24.9-50.298 42.242-85.17 52.376 37.78 11.502 65.81 32.181 83.737 62.315 19.28 32.4 27.879 73.149 27.879 121.166v23.376h-.008c.299 3.648.551 7.295.751 10.905l.006.001h143.2v150H587.947v-261.92z"/>
                </svg>
                Remix
              </h2>
              <p className="text-muted-foreground mb-6">
                Integrate ReactCheck with your Remix application.
              </p>

              <CodeBlock
                code={`{
  "scripts": {
    "dev": "remix dev",
    "build": "remix build",
    "start": "remix-serve build",
    "perf": "npm run dev & npx wait-on http://localhost:3000 && npx @oxog/react-check http://localhost:3000"
  }
}`}
                language="json"
                filename="package.json"
              />
            </section>

            {/* Vite */}
            <section id="vite" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 410 404" fill="none">
                  <path d="M399.641 59.5246L215.643 388.545C211.844 395.338 202.084 395.378 198.228 388.618L10.5817 59.5563C6.38087 52.1896 12.6802 43.2665 21.0281 44.7586L205.223 77.6824C206.398 77.8924 207.601 77.8904 208.776 77.6763L389.119 44.8058C397.439 43.2894 403.768 52.1434 399.641 59.5246Z" fill="url(#paint0_linear)"/>
                  <path d="M292.965 1.5744L156.801 28.2552C154.563 28.6937 152.906 30.5903 152.771 32.8664L144.395 174.33C144.198 177.662 147.258 180.248 150.51 179.498L188.42 170.749C191.967 169.931 195.172 173.055 194.443 176.622L183.18 231.775C182.422 235.487 185.907 238.661 189.532 237.56L212.947 230.446C216.577 229.344 220.065 232.527 219.297 236.242L201.398 322.875C200.278 328.294 207.486 331.249 210.492 326.603L212.5 323.5L323.454 102.072C325.312 98.3645 322.108 94.137 318.036 94.9228L279.014 102.454C275.347 103.161 272.227 99.746 273.262 96.1583L298.731 7.86689C299.767 4.27314 296.636 0.855181 292.965 1.5744Z" fill="url(#paint1_linear)"/>
                  <defs>
                    <linearGradient id="paint0_linear" x1="6.00017" y1="32.9999" x2="235" y2="344" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#41D1FF"/>
                      <stop offset="1" stopColor="#BD34FE"/>
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="194.651" y1="8.81818" x2="236.076" y2="292.989" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFBD4F"/>
                      <stop offset="1" stopColor="#FF980E"/>
                    </linearGradient>
                  </defs>
                </svg>
                Vite
              </h2>
              <p className="text-muted-foreground mb-6">
                Run ReactCheck alongside your Vite development server.
              </p>

              <CodeBlock
                code={`{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "perf": "vite & npx wait-on http://localhost:5173 && npx @oxog/react-check http://localhost:5173",
    "perf:ci": "vite preview & npx wait-on http://localhost:4173 && npx @oxog/react-check --headless --fail-on-critical http://localhost:4173"
  }
}`}
                language="json"
                filename="package.json"
              />
            </section>

            {/* GitHub Actions */}
            <section id="github-actions" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub Actions
              </h2>
              <p className="text-muted-foreground mb-6">
                Automatically run performance checks on every pull request.
              </p>

              <IDEWindow
                files={[{
                  name: '.github/workflows/performance.yml',
                  language: 'yaml',
                  code: githubActionsCode,
                }]}
                title="VS Code — .github/workflows/performance.yml"
              />
            </section>

            {/* GitLab CI */}
            <section id="gitlab-ci" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 380 380" fill="currentColor">
                  <path d="M282.83 170.73l-.27-.69-26.14-68.22a6.81 6.81 0 00-2.69-3.24 7 7 0 00-8 .43 7 7 0 00-2.32 3.52l-17.65 54h-71.47l-17.65-54a6.86 6.86 0 00-2.32-3.53 7 7 0 00-8-.43 6.87 6.87 0 00-2.69 3.24L97.44 170l-.26.69a48.54 48.54 0 0016.1 56.1l.09.07.24.17 39.82 29.82 19.7 14.91 12 9.06a8.07 8.07 0 009.76 0l12-9.06 19.7-14.91 40.06-30 .1-.08a48.56 48.56 0 0016.08-56.04z" fill="#E24329"/>
                  <path d="M282.83 170.73l-.27-.69a88.3 88.3 0 00-35.15 15.8L190 229.25c19.55 14.79 36.57 27.64 36.57 27.64l40.06-30 .1-.08a48.56 48.56 0 0016.1-56.08z" fill="#FC6D26"/>
                  <path d="M153.43 256.89l19.7 14.91 12 9.06a8.07 8.07 0 009.76 0l12-9.06 19.7-14.91S209.55 244 190 229.25c-19.55 14.75-36.57 27.64-36.57 27.64z" fill="#FCA326"/>
                  <path d="M132.58 185.84A88.19 88.19 0 0097.44 170l-.26.69a48.54 48.54 0 0016.1 56.1l.09.07.24.17 39.82 29.82L190 229.21z" fill="#FC6D26"/>
                </svg>
                GitLab CI
              </h2>
              <p className="text-muted-foreground mb-6">
                Integrate ReactCheck into your GitLab CI/CD pipeline.
              </p>

              <CodeBlock
                code={gitlabCICode}
                language="yaml"
                filename=".gitlab-ci.yml"
              />
            </section>

            {/* Vitest */}
            <section id="vitest" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 165 165" fill="none">
                  <path d="M120.831 57.2543L84.693 109.505C84.3099 110.059 83.7558 110.474 83.1148 110.687C82.4738 110.9 81.7809 110.898 81.1412 110.684C80.5765 110.477 80.0854 110.105 79.7307 109.617C79.3761 109.129 79.1735 108.547 79.1479 107.945L77.5109 72.0571L52.5765 76.8073C52.0258 76.9137 51.4577 76.8728 50.928 76.689C50.3984 76.5052 49.926 76.1851 49.5565 75.7601C49.187 75.335 48.9333 74.8196 48.8196 74.2653C48.7058 73.7109 48.7356 73.1367 48.9062 72.5969L64.1145 25.0874C64.2324 24.7088 64.4302 24.3602 64.6943 24.0651C64.9584 23.7699 65.2826 23.535 65.6449 23.376C66.0072 23.217 66.399 23.1377 66.7944 23.1434C67.1898 23.149 67.5792 23.2395 67.9367 23.4089L120.28 47.9091C120.822 48.163 121.279 48.5665 121.599 49.0724C121.919 49.5784 122.089 50.1659 122.088 50.7655C122.088 51.365 121.917 51.9521 121.596 52.4573C121.275 52.9625 120.817 53.365 120.275 53.6177L97.1504 64.3841L120.831 57.2543Z" fill="#FCC72B"/>
                  <path d="M120.831 57.2543L97.1504 64.3841L120.275 53.6177C120.817 53.365 121.275 52.9625 121.596 52.4573C121.917 51.9521 122.088 51.365 122.088 50.7655C122.089 50.1659 121.919 49.5784 121.599 49.0724C121.279 48.5665 120.822 48.163 120.28 47.9091L67.9367 23.4089C67.5792 23.2395 67.1898 23.149 66.7944 23.1434C66.399 23.1377 66.0072 23.217 65.6449 23.376C65.2826 23.535 64.9584 23.7699 64.6943 24.0651C64.4302 24.3602 64.2324 24.7088 64.1145 25.0874L48.9062 72.5969C48.7356 73.1367 48.7058 73.7109 48.8196 74.2653C48.9333 74.8196 49.187 75.335 49.5565 75.7601C49.926 76.1851 50.3984 76.5052 50.928 76.689C51.4577 76.8728 52.0258 76.9137 52.5765 76.8073L77.5109 72.0571L79.1479 107.945C79.1735 108.547 79.3761 109.129 79.7307 109.617C80.0854 110.105 80.5765 110.477 81.1412 110.684C81.7809 110.898 82.4738 110.9 83.1148 110.687C83.7558 110.474 84.3099 110.059 84.693 109.505L120.831 57.2543Z" fill="url(#paint0_linear_vitest)"/>
                  <defs>
                    <linearGradient id="paint0_linear_vitest" x1="49.0566" y1="23.1434" x2="110.357" y2="98.0104" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#41D1FF"/>
                      <stop offset="1" stopColor="#BD34FE"/>
                    </linearGradient>
                  </defs>
                </svg>
                Vitest
              </h2>
              <p className="text-muted-foreground mb-6">
                Add performance assertions to your Vitest test suite.
              </p>

              <IDEWindow
                files={[{
                  name: 'tests/performance.test.ts',
                  language: 'typescript',
                  code: vitestCode,
                }]}
                title="VS Code — tests/performance.test.ts"
              />
            </section>

            {/* Playwright */}
            <section id="playwright" className="mb-16 scroll-mt-20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <svg className="w-8 h-8" viewBox="0 0 400 400" fill="currentColor">
                  <rect width="400" height="400" rx="40" fill="#2EAD33"/>
                  <path d="M92 180.5C92 152.162 114.938 129 143 129H257C285.062 129 308 152.162 308 180.5V271H92V180.5Z" fill="white"/>
                  <circle cx="156" cy="195" r="20" fill="#2EAD33"/>
                  <circle cx="244" cy="195" r="20" fill="#2EAD33"/>
                  <path d="M170 235C170 235 185 250 200 250C215 250 230 235 230 235" stroke="#2EAD33" strokeWidth="8" strokeLinecap="round"/>
                </svg>
                Playwright
              </h2>
              <p className="text-muted-foreground mb-6">
                Combine Playwright's powerful browser automation with ReactCheck analysis.
              </p>

              <IDEWindow
                files={[{
                  name: 'tests/performance.spec.ts',
                  language: 'typescript',
                  code: playwrightCode,
                }]}
                title="VS Code — tests/performance.spec.ts"
              />
            </section>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8 border-t border-border">
              <Link to="/fixes" className="text-primary hover:underline flex items-center gap-1">
                ← Fix Suggestions
              </Link>
              <Link to="/docs" className="text-primary hover:underline flex items-center gap-1">
                Back to Docs <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
