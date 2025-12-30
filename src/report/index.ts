/**
 * Report module exports
 * @packageDocumentation
 */

export { generateJSONReport, parseJSONReport, validateJSONReport } from './json.js';
export { generateMarkdownReport } from './markdown.js';
export { generateHTMLReport } from './html.js';

import type { SessionReport, ReportOptions } from '../types.js';
import { generateJSONReport } from './json.js';
import { generateMarkdownReport } from './markdown.js';
import { generateHTMLReport } from './html.js';
import { ensureDir, writeTextFile, joinPath } from '../utils/fs.js';

/**
 * Report format type
 */
export type ReportFormat = 'html' | 'json' | 'md';

/**
 * Generate report in specified format
 * @param report - Session report data
 * @param format - Output format
 * @returns Report content string
 */
export function generateReport(report: SessionReport, format: ReportFormat): string {
  switch (format) {
    case 'html':
      return generateHTMLReport(report);
    case 'json':
      return generateJSONReport(report);
    case 'md':
      return generateMarkdownReport(report);
    default:
      throw new Error(`Unknown report format: ${format}`);
  }
}

/**
 * Save report to file
 * @param report - Session report data
 * @param format - Output format
 * @param outputDir - Output directory
 * @param filename - Base filename (without extension)
 * @returns Path to saved file
 */
export async function saveReport(
  report: SessionReport,
  format: ReportFormat,
  outputDir: string,
  filename?: string
): Promise<string> {
  await ensureDir(outputDir);

  const baseName = filename ?? `reactcheck-report-${Date.now()}`;
  const extension = format === 'md' ? 'md' : format;
  const filePath = joinPath(outputDir, `${baseName}.${extension}`);

  const content = generateReport(report, format);
  await writeTextFile(filePath, content);

  return filePath;
}

/**
 * Save reports in multiple formats
 * @param report - Session report data
 * @param options - Report options
 * @returns Paths to saved files
 */
export async function saveReports(
  report: SessionReport,
  options: ReportOptions
): Promise<string[]> {
  const paths: string[] = [];

  if (!options.enabled) {
    return paths;
  }

  await ensureDir(options.output);

  const baseName = `reactcheck-report-${Date.now()}`;

  for (const format of options.formats) {
    const path = await saveReport(report, format, options.output, baseName);
    paths.push(path);
  }

  return paths;
}

/**
 * Report generator class for more control
 */
export class ReportGenerator {
  /** Report options */
  private options: ReportOptions;

  /**
   * Create a new report generator
   * @param options - Report options
   */
  constructor(options: Partial<ReportOptions> = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      formats: options.formats ?? ['html', 'json'],
      output: options.output ?? './reactcheck-reports',
      includeSourceCode: options.includeSourceCode ?? false,
    };
  }

  /**
   * Generate report content
   * @param report - Session report data
   * @param format - Output format
   * @returns Report content
   */
  generate(report: SessionReport, format: ReportFormat): string {
    return generateReport(report, format);
  }

  /**
   * Generate all configured report formats
   * @param report - Session report data
   * @returns Map of format to content
   */
  generateAll(report: SessionReport): Map<ReportFormat, string> {
    const results = new Map<ReportFormat, string>();

    for (const format of this.options.formats) {
      results.set(format, this.generate(report, format));
    }

    return results;
  }

  /**
   * Save report to file
   * @param report - Session report data
   * @param format - Output format
   * @returns Path to saved file
   */
  async save(report: SessionReport, format: ReportFormat): Promise<string> {
    return saveReport(report, format, this.options.output);
  }

  /**
   * Save all configured report formats
   * @param report - Session report data
   * @returns Paths to saved files
   */
  async saveAll(report: SessionReport): Promise<string[]> {
    return saveReports(report, this.options);
  }

  /**
   * Get report options
   * @returns Current options
   */
  getOptions(): ReportOptions {
    return { ...this.options };
  }

  /**
   * Update report options
   * @param options - Partial options to update
   */
  configure(options: Partial<ReportOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
