/**
 * Report generation example
 *
 * This example shows how to generate reports from scan results.
 */

import {
  createReportGenerator,
  generateHTMLReport,
  generateJSONReport,
  generateMarkdownReport,
  saveReport,
  type SessionReport,
  type ComponentStats,
} from '@oxog/react-check';

// Example scan results (in real usage, this comes from scanner.getReport())
const mockReport: SessionReport = {
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  target: 'http://localhost:3000',
  duration: 30000,
  summary: {
    totalComponents: 15,
    totalRenders: 450,
    criticalIssues: 2,
    warnings: 5,
    healthy: 8,
    avgFps: 55.5,
    minFps: 42,
    unnecessaryRenders: 180,
  },
  components: [
    {
      name: 'DataGrid',
      renders: 120,
      unnecessary: 95,
      avgRenderTime: 12.5,
      maxRenderTime: 45.2,
      severity: 'critical',
      chain: ['App', 'Dashboard', 'DataGrid'],
    },
    {
      name: 'UserProfile',
      renders: 75,
      unnecessary: 60,
      avgRenderTime: 3.2,
      maxRenderTime: 8.5,
      severity: 'critical',
      chain: ['App', 'Header', 'UserProfile'],
    },
    {
      name: 'Sidebar',
      renders: 35,
      unnecessary: 15,
      avgRenderTime: 2.1,
      maxRenderTime: 5.0,
      severity: 'warning',
      chain: ['App', 'Layout', 'Sidebar'],
    },
  ] as ComponentStats[],
  chains: [
    {
      trigger: 'App.setState',
      chain: ['App', 'Dashboard', 'DataGrid', 'Row', 'Cell'],
      depth: 5,
      totalRenders: 120,
      rootCause: 'App',
      timestamp: Date.now(),
      isContextTriggered: false,
    },
  ],
  suggestions: [
    {
      componentName: 'DataGrid',
      severity: 'critical',
      issue: 'Component re-renders 120 times with 95 unnecessary renders',
      cause: 'Parent component causes cascading re-renders',
      fix: 'Wrap DataGrid with React.memo',
      codeBefore: 'function DataGrid({ data }) {\n  return <table>...</table>;\n}',
      codeAfter:
        'const DataGrid = React.memo(function DataGrid({ data }) {\n  return <table>...</table>;\n});',
    },
    {
      componentName: 'UserProfile',
      severity: 'critical',
      issue: 'Component re-renders when unrelated state changes',
      cause: 'Receives new object reference on each render',
      fix: 'Use useMemo for computed values',
      codeBefore: 'const userInfo = { ...user, fullName: `${user.first} ${user.last}` };',
      codeAfter:
        'const userInfo = useMemo(() => ({\n  ...user,\n  fullName: `${user.first} ${user.last}`\n}), [user]);',
    },
  ],
};

async function generateReports() {
  console.log('Generating reports...\n');

  // Method 1: Using ReportGenerator class
  const generator = createReportGenerator({
    formats: ['html', 'json', 'md'],
    output: './example-reports',
  });

  // Save all formats at once
  const paths = await generator.saveAll(mockReport);
  console.log('Reports saved:');
  for (const path of paths) {
    console.log(`  - ${path}`);
  }

  // Method 2: Using individual generators
  console.log('\n--- HTML Report Preview ---');
  const htmlReport = generateHTMLReport(mockReport);
  console.log(`Generated HTML report: ${htmlReport.length} characters`);

  console.log('\n--- JSON Report Preview ---');
  const jsonReport = generateJSONReport(mockReport);
  console.log(JSON.stringify(JSON.parse(jsonReport), null, 2).slice(0, 500) + '...');

  console.log('\n--- Markdown Report Preview ---');
  const mdReport = generateMarkdownReport(mockReport);
  console.log(mdReport.slice(0, 800) + '...');

  // Method 3: Save individual report
  await saveReport(htmlReport, './example-reports/custom-report.html');
  console.log('\nCustom report saved to ./example-reports/custom-report.html');
}

generateReports().catch(console.error);
