# ReactCheck Examples

This directory contains example scripts demonstrating how to use ReactCheck.

## Examples

### basic-scan.ts

The simplest way to scan a React application. Uses the `quickScan` function to launch a browser, scan the app, and generate reports.

```bash
npx ts-node examples/basic-scan.ts
```

### programmatic-scanner.ts

Shows how to use the Scanner class directly for custom integrations. Demonstrates real-time event handling and manual statistics collection.

```bash
npx ts-node examples/programmatic-scanner.ts
```

### report-generation.ts

Demonstrates different ways to generate reports from scan results. Shows HTML, JSON, and Markdown output formats.

```bash
npx ts-node examples/report-generation.ts
```

### framework-detection.ts

Shows how to detect the React framework being used and get framework-specific optimization tips.

```bash
npx ts-node examples/framework-detection.ts
```

## Running Examples

1. Install dependencies:

```bash
npm install
npm install puppeteer  # For browser automation
npm install ts-node    # For running TypeScript directly
```

2. Build the project:

```bash
npm run build
```

3. Run an example:

```bash
npx ts-node examples/basic-scan.ts
```

## Prerequisites

For examples that scan live applications:

1. Have a React application running on localhost:3000 (or modify the URL in the example)
2. Install puppeteer for browser automation

## Creating Your Own Integration

The examples show three levels of integration:

1. **High-level API** (`quickScan`): Best for simple scripts and CI/CD
2. **Scanner class**: Best for custom dashboards and real-time monitoring
3. **Individual modules**: Best for advanced customization and embedding

Choose the level that fits your use case.
