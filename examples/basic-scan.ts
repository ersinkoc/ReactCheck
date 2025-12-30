/**
 * Basic React application scan example
 *
 * This example shows how to scan a React application for performance issues.
 */

import { quickScan } from '@oxog/react-check';

async function main() {
  console.log('Starting ReactCheck scan...');

  try {
    const report = await quickScan('http://localhost:3000', {
      duration: 30000, // 30 seconds
      headless: true,
      output: './reactcheck-reports',
      formats: ['html', 'json'],
    });

    console.log('\n=== Scan Complete ===\n');
    console.log(`Total Components: ${report.summary.totalComponents}`);
    console.log(`Total Renders: ${report.summary.totalRenders}`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    console.log(`Healthy: ${report.summary.healthy}`);
    console.log(`Average FPS: ${report.summary.avgFps.toFixed(1)}`);

    if (report.summary.criticalIssues > 0) {
      console.log('\n=== Critical Components ===\n');
      const critical = report.components.filter((c) => c.severity === 'critical');
      for (const comp of critical) {
        console.log(`  ${comp.name}: ${comp.renders} renders (${comp.unnecessary} unnecessary)`);
      }
    }

    console.log('\nReports saved to ./reactcheck-reports/');
  } catch (error) {
    console.error('Scan failed:', error);
    process.exit(1);
  }
}

main();
