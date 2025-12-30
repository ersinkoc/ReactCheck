/**
 * Framework detection module
 * @packageDocumentation
 */

import type { FrameworkInfo } from '../types.js';
import { exists, readJsonFile, findUp, joinPath, getDirName } from '../utils/fs.js';

/**
 * Framework detector configuration
 */
interface FrameworkDetector {
  /** Framework name */
  name: FrameworkInfo['name'];
  /** Dependencies to look for */
  dependencies: string[];
  /** DevDependencies to look for */
  devDependencies?: string[];
  /** Features to detect */
  features: Array<{
    /** Feature name */
    name: string;
    /** File patterns to check */
    files?: string[];
    /** Dependencies to check */
    deps?: string[];
    /** Detection function */
    detect?: (packageJson: PackageJson, dir: string) => Promise<boolean>;
  }>;
  /** Framework-specific tips */
  tips: string[];
}

/**
 * Package.json structure
 */
interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * Framework detectors configuration
 */
const FRAMEWORK_DETECTORS: FrameworkDetector[] = [
  // Next.js
  {
    name: 'next',
    dependencies: ['next'],
    features: [
      {
        name: 'app-router',
        detect: async (_, dir) => exists(joinPath(dir, 'app')),
      },
      {
        name: 'pages-router',
        detect: async (_, dir) => exists(joinPath(dir, 'pages')),
      },
      {
        name: 'rsc',
        deps: ['next'],
        detect: async (pkg) => {
          const version = pkg.dependencies?.['next'] ?? '';
          const major = parseInt(version.replace(/[^0-9]/g, '').slice(0, 2), 10);
          return major >= 13;
        },
      },
      {
        name: 'middleware',
        detect: async (_, dir) => exists(joinPath(dir, 'middleware.ts')) ||
          exists(joinPath(dir, 'middleware.js')),
      },
    ],
    tips: [
      'Use "use client" directive only for interactive components',
      'Keep server components as the default for better performance',
      'Consider using Server Actions for mutations',
      'Use next/dynamic for code splitting heavy components',
      'Avoid passing serializable props through server/client boundary',
    ],
  },

  // Remix
  {
    name: 'remix',
    dependencies: ['@remix-run/react', '@remix-run/node', '@remix-run/cloudflare'],
    features: [
      {
        name: 'v2-routes',
        detect: async (_, dir) =>
          exists(joinPath(dir, 'app', 'routes')),
      },
      {
        name: 'defer',
        deps: ['@remix-run/react'],
        detect: async (pkg) => {
          const version = pkg.dependencies?.['@remix-run/react'] ?? '';
          return version.includes('1.') || version.includes('2.');
        },
      },
    ],
    tips: [
      'Use loader data efficiently to minimize client state',
      'Prefer fetcher over useNavigate for non-navigation mutations',
      'Use defer for streaming slow data',
      'Consider using useFetcher.load for background data fetching',
      'Avoid useEffect for data fetching, use loaders instead',
    ],
  },

  // Vite
  {
    name: 'vite',
    dependencies: [],
    devDependencies: ['vite'],
    features: [
      {
        name: 'react-plugin',
        deps: ['@vitejs/plugin-react', '@vitejs/plugin-react-swc'],
      },
      {
        name: 'ssr',
        detect: async (_, dir) =>
          exists(joinPath(dir, 'vite.config.ts')) ||
          exists(joinPath(dir, 'vite.config.js')),
      },
    ],
    tips: [
      'Use React.lazy with Suspense for code splitting',
      'Configure build.rollupOptions.output.manualChunks for optimal chunking',
      'Enable build.sourcemap only in development',
      'Use @vitejs/plugin-react-swc for faster builds',
      'Consider using vite-plugin-pwa for PWA support',
    ],
  },

  // Create React App
  {
    name: 'cra',
    dependencies: ['react-scripts'],
    features: [
      {
        name: 'typescript',
        deps: ['typescript'],
      },
      {
        name: 'testing-library',
        deps: ['@testing-library/react'],
      },
    ],
    tips: [
      'Consider migrating to Vite for faster development builds',
      'Use React.lazy for code splitting',
      'Run "npm run build -- --stats" to analyze bundle size',
      'Use REACT_APP_ prefix for environment variables',
      'Consider ejecting only if absolutely necessary',
    ],
  },

  // Gatsby
  {
    name: 'gatsby',
    dependencies: ['gatsby'],
    features: [
      {
        name: 'v5',
        deps: ['gatsby'],
        detect: async (pkg) => {
          const version = pkg.dependencies?.['gatsby'] ?? '';
          return version.includes('5.') || version.includes('^5');
        },
      },
      {
        name: 'image',
        deps: ['gatsby-plugin-image'],
      },
      {
        name: 'graphql',
        deps: ['gatsby'],
      },
    ],
    tips: [
      'Use gatsby-plugin-image for optimized images',
      'Prefer StaticQuery over page queries for reusable components',
      'Use incremental builds for faster development',
      'Configure proper caching headers for static assets',
      'Consider using DSG (Deferred Static Generation) for large sites',
    ],
  },
];

/**
 * Detect framework from package.json
 * @param packageJsonPath - Path to package.json
 * @returns Framework info or null
 */
export async function detectFramework(packageJsonPath?: string): Promise<FrameworkInfo | null> {
  // Find package.json if not provided
  let pkgPath: string | undefined = packageJsonPath;
  if (!pkgPath) {
    pkgPath = (await findUp('package.json')) ?? undefined;
  }

  if (!pkgPath || !(await exists(pkgPath))) {
    return null;
  }

  // Read package.json
  let packageJson: PackageJson;
  try {
    packageJson = await readJsonFile<PackageJson>(pkgPath);
  } catch {
    return null;
  }

  const projectDir = getDirName(pkgPath);

  // Check each framework detector
  for (const detector of FRAMEWORK_DETECTORS) {
    const match = await matchFramework(detector, packageJson, projectDir);
    if (match) {
      return match;
    }
  }

  return {
    name: 'unknown',
    version: '',
    features: [],
    tips: [
      'Consider using React.memo for frequently re-rendering components',
      'Use useCallback for event handlers passed to child components',
      'Use useMemo for expensive computations',
      'Avoid inline object/array creation in render',
    ],
  };
}

/**
 * Check if a framework matches
 * @param detector - Framework detector
 * @param packageJson - Package.json data
 * @param projectDir - Project directory
 * @returns Framework info if matched
 */
async function matchFramework(
  detector: FrameworkDetector,
  packageJson: PackageJson,
  projectDir: string
): Promise<FrameworkInfo | null> {
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check if any dependency matches
  const mainDep = detector.dependencies.find((dep) => dep in allDeps) ??
    detector.devDependencies?.find((dep) => dep in (packageJson.devDependencies ?? {}));

  if (!mainDep) {
    return null;
  }

  // Get version
  const version = allDeps[mainDep]?.replace(/[\^~]/g, '') ?? 'unknown';

  // Detect features
  const features: string[] = [];
  for (const feature of detector.features) {
    let detected = false;

    // Check dependencies
    if (feature.deps) {
      detected = feature.deps.some((dep) => dep in allDeps);
    }

    // Check files
    if (feature.files && !detected) {
      for (const file of feature.files) {
        if (await exists(joinPath(projectDir, file))) {
          detected = true;
          break;
        }
      }
    }

    // Custom detection
    if (feature.detect && !detected) {
      try {
        detected = await feature.detect(packageJson, projectDir);
      } catch {
        // Ignore detection errors
      }
    }

    if (detected) {
      features.push(feature.name);
    }
  }

  return {
    name: detector.name,
    version,
    features,
    tips: detector.tips,
  };
}

/**
 * Get framework-specific tips based on detected issues
 * @param framework - Detected framework
 * @param issues - Detected performance issues
 * @returns Relevant tips
 */
export function getFrameworkTips(
  framework: FrameworkInfo,
  issues: Array<{ type: string; component: string }>
): string[] {
  const tips: string[] = [];

  // Add general framework tips
  tips.push(...framework.tips.slice(0, 3));

  // Add issue-specific tips
  if (issues.some((i) => i.type === 'context-over-subscription')) {
    switch (framework.name) {
      case 'next':
        tips.push('Consider using server components to avoid client-side context re-renders');
        break;
      case 'remix':
        tips.push('Use loader data instead of context for server data');
        break;
      default:
        tips.push('Split large contexts into smaller, focused contexts');
    }
  }

  if (issues.some((i) => i.type === 'expensive-computation')) {
    switch (framework.name) {
      case 'next':
        tips.push('Move expensive computations to server components');
        break;
      case 'gatsby':
        tips.push('Use GraphQL for data transformation at build time');
        break;
      default:
        tips.push('Use useMemo to cache expensive computations');
    }
  }

  return [...new Set(tips)]; // Remove duplicates
}

/**
 * Detect framework from window object (browser-side)
 * @returns Framework info based on global variables
 */
export function detectFrameworkFromWindow(): FrameworkInfo | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const win = window as unknown as Record<string, unknown>;

  // Check for Next.js
  if (win['__NEXT_DATA__'] !== undefined) {
    const doc = (win['document'] as Document | undefined) ?? (typeof document !== 'undefined' ? document : null);
    const isAppRouter = doc?.querySelector('[data-nextjs-scroll-focus-boundary]') !== null;

    return {
      name: 'next',
      version: 'unknown',
      features: isAppRouter ? ['app-router', 'rsc'] : ['pages-router'],
      tips: [],
    };
  }

  // Check for Gatsby
  if (win['___gatsby'] !== undefined) {
    return {
      name: 'gatsby',
      version: 'unknown',
      features: [],
      tips: [],
    };
  }

  // Check for Remix
  if (win['__remixContext'] !== undefined) {
    return {
      name: 'remix',
      version: 'unknown',
      features: [],
      tips: [],
    };
  }

  return null;
}

/**
 * Export framework detector for use in CLI
 */
export { FRAMEWORK_DETECTORS as frameworkDetectors };
