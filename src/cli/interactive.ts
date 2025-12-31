/**
 * Interactive CLI wizard for ReactCheck
 * @packageDocumentation
 */

import * as readline from 'readline';
import { colors } from '../utils/colors.js';

/**
 * Wizard configuration result
 */
export interface WizardConfig {
  /** Target URL to scan */
  url: string;
  /** Display mode */
  mode: 'tui' | 'webui' | 'headless';
  /** Scan duration in seconds */
  duration: number;
  /** Warning threshold */
  warningThreshold: number;
  /** Critical threshold */
  criticalThreshold: number;
  /** Report formats */
  reportFormats: ('html' | 'json' | 'md')[];
  /** Output directory */
  outputDir: string;
  /** Run in headless browser mode */
  headless: boolean;
  /** WebUI port (only for webui mode) */
  webuiPort: number;
}

/**
 * Menu option
 */
interface MenuOption<T> {
  label: string;
  value: T;
  description?: string;
}

/**
 * Interactive wizard for CLI configuration
 */
export class InteractiveWizard {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Run the interactive wizard
   */
  async run(): Promise<WizardConfig | null> {
    this.printHeader();

    try {
      // Step 1: URL
      const url = await this.askUrl();
      if (!url) {
        this.close();
        return null;
      }

      // Step 2: Mode
      const mode = await this.askMode();

      // Step 2.5: WebUI Port (only if webui mode selected)
      let webuiPort = 3199;
      if (mode === 'webui') {
        webuiPort = await this.askWebuiPort();
      }

      // Step 3: Duration
      const duration = await this.askDuration();

      // Step 4: Thresholds
      const { warning, critical } = await this.askThresholds();

      // Step 5: Report formats
      const reportFormats = await this.askReportFormats();

      // Step 6: Output directory
      const outputDir = await this.askOutputDir();

      // Step 7: Headless mode (skip for WebUI - user needs to interact with site)
      // For WebUI mode, always show browser so user can interact with their site
      const headless = mode === 'webui' ? false : await this.askHeadless();

      // Show summary
      this.printSummary({
        url,
        mode,
        duration,
        warningThreshold: warning,
        criticalThreshold: critical,
        reportFormats,
        outputDir,
        headless,
        webuiPort,
      });

      // Confirm
      const confirmed = await this.askConfirm();

      this.close();

      if (!confirmed) {
        return null;
      }

      return {
        url,
        mode,
        duration,
        warningThreshold: warning,
        criticalThreshold: critical,
        reportFormats,
        outputDir,
        headless,
        webuiPort,
      };
    } catch {
      this.close();
      return null;
    }
  }

  /**
   * Print wizard header
   */
  private printHeader(): void {
    console.log('');
    console.log(
      colors.cyan +
        '┌─────────────────────────────────────────────────────────────┐' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        '                                                             ' +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        '   ' +
        colors.bold +
        colors.green +
        '⚛  ReactCheck' +
        colors.reset +
        ' - Interactive Setup Wizard                 ' +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        '                                                             ' +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '└─────────────────────────────────────────────────────────────┘' +
        colors.reset
    );
    console.log('');
  }

  /**
   * Ask for URL
   */
  private async askUrl(): Promise<string> {
    console.log(colors.bold + '📍 Step 1/7: Target URL' + colors.reset);
    console.log(colors.dim + '   Enter the URL of the React app to scan' + colors.reset);
    console.log('');

    const url = await this.prompt('   URL: ', 'http://localhost:3000');

    if (!url) {
      console.log(colors.yellow + '   ⚠ URL is required' + colors.reset);
      return this.askUrl();
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      console.log(colors.red + '   ✗ Invalid URL format' + colors.reset);
      return this.askUrl();
    }

    console.log('');
    return url;
  }

  /**
   * Ask for display mode
   */
  private async askMode(): Promise<'tui' | 'webui' | 'headless'> {
    console.log(colors.bold + '🖥️  Step 2/7: Display Mode' + colors.reset);
    console.log(colors.dim + '   How do you want to view the results?' + colors.reset);
    console.log('');

    const options: MenuOption<'tui' | 'webui' | 'headless'>[] = [
      { label: 'TUI', value: 'tui', description: 'Terminal UI with real-time updates' },
      { label: 'WebUI', value: 'webui', description: 'Browser dashboard at localhost:3199' },
      { label: 'Headless', value: 'headless', description: 'No UI, just generate reports' },
    ];

    const mode = await this.selectMenu(options, 'tui');
    console.log('');
    return mode;
  }

  /**
   * Ask for WebUI port
   */
  private async askWebuiPort(): Promise<number> {
    console.log(colors.bold + '🌐 WebUI Port' + colors.reset);
    console.log(colors.dim + '   Which port should the WebUI dashboard use?' + colors.reset);
    console.log('');

    const portStr = await this.prompt('   Port: ', '3199');
    const port = parseInt(portStr, 10);

    if (isNaN(port) || port < 1 || port > 65535) {
      console.log(colors.yellow + '   ⚠ Invalid port, using default 3199' + colors.reset);
      console.log('');
      return 3199;
    }

    console.log('');
    return port;
  }

  /**
   * Ask for duration
   */
  private async askDuration(): Promise<number> {
    console.log(colors.bold + '⏱️  Step 3/7: Scan Duration' + colors.reset);
    console.log(colors.dim + '   How long should the scan run? (in seconds)' + colors.reset);
    console.log('');

    const options: MenuOption<number>[] = [
      { label: '15 seconds', value: 15, description: 'Quick scan' },
      { label: '30 seconds', value: 30, description: 'Standard scan (recommended)' },
      { label: '60 seconds', value: 60, description: 'Thorough scan' },
      { label: '120 seconds', value: 120, description: 'Extended scan' },
      { label: 'Custom', value: -1, description: 'Enter custom duration' },
    ];

    const duration = await this.selectMenu(options, 30);

    if (duration === -1) {
      const custom = await this.prompt('   Duration (seconds): ', '30');
      const parsed = parseInt(custom, 10);
      if (isNaN(parsed) || parsed < 5) {
        console.log(colors.yellow + '   ⚠ Using default 30 seconds' + colors.reset);
        console.log('');
        return 30;
      }
      console.log('');
      return parsed;
    }

    console.log('');
    return duration;
  }

  /**
   * Ask for thresholds
   */
  private async askThresholds(): Promise<{ warning: number; critical: number }> {
    console.log(colors.bold + '📊 Step 4/7: Render Thresholds' + colors.reset);
    console.log(
      colors.dim + '   Set thresholds for warning and critical render counts' + colors.reset
    );
    console.log('');

    const options: MenuOption<{ warning: number; critical: number }>[] = [
      { label: 'Relaxed', value: { warning: 30, critical: 75 }, description: 'For complex apps' },
      {
        label: 'Standard',
        value: { warning: 20, critical: 50 },
        description: 'Recommended defaults',
      },
      { label: 'Strict', value: { warning: 10, critical: 25 }, description: 'High performance' },
      { label: 'Custom', value: { warning: -1, critical: -1 }, description: 'Set your own' },
    ];

    const result = await this.selectMenu(options, { warning: 20, critical: 50 });

    if (result.warning === -1) {
      const warnStr = await this.prompt('   Warning threshold: ', '20');
      const critStr = await this.prompt('   Critical threshold: ', '50');
      console.log('');
      return {
        warning: parseInt(warnStr, 10) || 20,
        critical: parseInt(critStr, 10) || 50,
      };
    }

    console.log('');
    return result;
  }

  /**
   * Ask for report formats
   */
  private async askReportFormats(): Promise<('html' | 'json' | 'md')[]> {
    console.log(colors.bold + '📄 Step 5/7: Report Formats' + colors.reset);
    console.log(
      colors.dim + '   Which report formats do you want to generate?' + colors.reset
    );
    console.log('');

    const formats: ('html' | 'json' | 'md')[] = [];

    const htmlAnswer = await this.prompt(
      '   Generate HTML report? ' + colors.dim + '(Y/n)' + colors.reset + ': ',
      'y'
    );
    if (htmlAnswer.toLowerCase() !== 'n') {
      formats.push('html');
    }

    const jsonAnswer = await this.prompt(
      '   Generate JSON report? ' + colors.dim + '(Y/n)' + colors.reset + ': ',
      'y'
    );
    if (jsonAnswer.toLowerCase() !== 'n') {
      formats.push('json');
    }

    const mdAnswer = await this.prompt(
      '   Generate Markdown report? ' + colors.dim + '(y/N)' + colors.reset + ': ',
      'n'
    );
    if (mdAnswer.toLowerCase() === 'y') {
      formats.push('md');
    }

    if (formats.length === 0) {
      formats.push('html', 'json');
      console.log(colors.dim + '   Using default: HTML, JSON' + colors.reset);
    }

    console.log('');
    return formats;
  }

  /**
   * Ask for output directory
   */
  private async askOutputDir(): Promise<string> {
    console.log(colors.bold + '📁 Step 6/7: Output Directory' + colors.reset);
    console.log(colors.dim + '   Where should reports be saved?' + colors.reset);
    console.log('');

    const dir = await this.prompt('   Directory: ', './reactcheck-reports');
    console.log('');
    return dir || './reactcheck-reports';
  }

  /**
   * Ask for headless mode
   */
  private async askHeadless(): Promise<boolean> {
    console.log(colors.bold + '👻 Step 7/7: Browser Mode' + colors.reset);
    console.log(colors.dim + '   Run browser in headless mode (invisible)?' + colors.reset);
    console.log(colors.dim + '   Note: If you want to interact with your site, choose No.' + colors.reset);
    console.log('');

    const answer = await this.prompt(
      '   Headless browser? ' + colors.dim + '(y/N)' + colors.reset + ': ',
      'n'
    );
    console.log('');
    return answer.toLowerCase() === 'y';
  }

  /**
   * Print configuration summary
   */
  private printSummary(config: WizardConfig): void {
    console.log(
      colors.cyan +
        '┌─────────────────────────────────────────────────────────────┐' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        colors.bold +
        '                    Configuration Summary                    ' +
        colors.reset +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '├─────────────────────────────────────────────────────────────┤' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        `   URL:        ${this.pad(config.url, 45)}` +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        `   Mode:       ${this.pad(config.mode.toUpperCase(), 45)}` +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        `   Duration:   ${this.pad(config.duration + ' seconds', 45)}` +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        `   Thresholds: ${this.pad(`Warning: ${config.warningThreshold}, Critical: ${config.criticalThreshold}`, 45)}` +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        `   Reports:    ${this.pad(config.reportFormats.join(', ').toUpperCase(), 45)}` +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        `   Output:     ${this.pad(config.outputDir, 45)}` +
        colors.cyan +
        '│' +
        colors.reset
    );
    console.log(
      colors.cyan +
        '│' +
        colors.reset +
        `   Headless:   ${this.pad(config.headless ? 'Yes' : 'No', 45)}` +
        colors.cyan +
        '│' +
        colors.reset
    );
    if (config.mode === 'webui') {
      console.log(
        colors.cyan +
          '│' +
          colors.reset +
          `   WebUI Port: ${this.pad(String(config.webuiPort), 45)}` +
          colors.cyan +
          '│' +
          colors.reset
      );
    }
    console.log(
      colors.cyan +
        '└─────────────────────────────────────────────────────────────┘' +
        colors.reset
    );
    console.log('');
  }

  /**
   * Ask for confirmation
   */
  private async askConfirm(): Promise<boolean> {
    const answer = await this.prompt(
      colors.green + '   Start scan with these settings? ' + colors.dim + '(Y/n)' + colors.reset + ': ',
      'y'
    );
    return answer.toLowerCase() !== 'n';
  }

  /**
   * Prompt for input
   */
  private prompt(question: string, defaultValue: string = ''): Promise<string> {
    return new Promise((resolve) => {
      const defaultHint = defaultValue ? colors.dim + ` [${defaultValue}]` + colors.reset : '';
      this.rl.question(question + defaultHint + ' ', (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  /**
   * Display a menu and get selection
   */
  private async selectMenu<T>(options: MenuOption<T>[], defaultValue: T): Promise<T> {
    // Display options
    options.forEach((opt, i) => {
      const isDefault = JSON.stringify(opt.value) === JSON.stringify(defaultValue);
      const marker = isDefault ? colors.green + '●' + colors.reset : colors.dim + '○' + colors.reset;
      const label = isDefault ? colors.bold + opt.label + colors.reset : opt.label;
      const desc = opt.description ? colors.dim + ' - ' + opt.description + colors.reset : '';
      console.log(`   ${marker} ${i + 1}. ${label}${desc}`);
    });

    console.log('');
    const answer = await this.prompt('   Select option: ', '');

    // Parse selection
    const num = parseInt(answer, 10);
    if (num >= 1 && num <= options.length) {
      const selected = options[num - 1];
      if (selected) {
        return selected.value;
      }
    }

    // Try matching by label
    const matched = options.find(
      (opt) => opt.label.toLowerCase() === answer.toLowerCase()
    );
    if (matched) {
      return matched.value;
    }

    // Return default
    return defaultValue;
  }

  /**
   * Pad string to fixed width
   */
  private pad(str: string, width: number): string {
    if (str.length >= width) {
      return str.substring(0, width - 3) + '...';
    }
    return str + ' '.repeat(width - str.length);
  }

  /**
   * Close readline interface
   */
  private close(): void {
    this.rl.close();
  }
}

/**
 * Run interactive wizard and return config
 */
export async function runInteractiveWizard(): Promise<WizardConfig | null> {
  const wizard = new InteractiveWizard();
  return wizard.run();
}
