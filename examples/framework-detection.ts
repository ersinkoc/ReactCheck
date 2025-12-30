/**
 * Framework detection example
 *
 * This example shows how to detect the React framework being used
 * and get framework-specific optimization tips.
 */

import {
  detectFramework,
  getFrameworkTips,
  type FrameworkInfo,
} from '@oxog/react-check';

async function detectAndAdvise() {
  console.log('Detecting React framework...\n');

  // Detect framework from package.json
  const framework = await detectFramework();

  if (!framework) {
    console.log('No React framework detected.');
    console.log('Make sure you run this from a React project directory.');
    return;
  }

  console.log('=== Framework Detected ===');
  console.log(`Name: ${framework.name}`);
  console.log(`Version: ${framework.version}`);

  if (framework.features.length > 0) {
    console.log(`Features: ${framework.features.join(', ')}`);
  }

  // Get framework-specific tips
  const tips = getFrameworkTips(framework);

  if (tips.length > 0) {
    console.log('\n=== Performance Tips ===\n');
    for (const tip of tips) {
      console.log(`- ${tip}`);
    }
  }
}

// Example of what the output looks like for different frameworks
function showExampleOutputs() {
  console.log('\n=== Example Outputs ===\n');

  // Next.js with App Router
  const nextAppRouter: FrameworkInfo = {
    name: 'next',
    version: '14.0.0',
    features: ['app-router', 'rsc'],
    tips: [],
  };

  console.log('Next.js (App Router):');
  const nextTips = getFrameworkTips(nextAppRouter);
  for (const tip of nextTips) {
    console.log(`  - ${tip}`);
  }

  // Remix
  const remix: FrameworkInfo = {
    name: 'remix',
    version: '2.0.0',
    features: ['routes', 'loaders'],
    tips: [],
  };

  console.log('\nRemix:');
  const remixTips = getFrameworkTips(remix);
  for (const tip of remixTips) {
    console.log(`  - ${tip}`);
  }

  // Vite
  const vite: FrameworkInfo = {
    name: 'vite',
    version: '5.0.0',
    features: ['hmr'],
    tips: [],
  };

  console.log('\nVite:');
  const viteTips = getFrameworkTips(vite);
  for (const tip of viteTips) {
    console.log(`  - ${tip}`);
  }
}

// Run detection
detectAndAdvise()
  .then(() => showExampleOutputs())
  .catch(console.error);
