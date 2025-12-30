/**
 * JSON report generator
 * @packageDocumentation
 */

import type { SessionReport } from '../types.js';

/**
 * Generate a JSON report
 * @param report - Session report data
 * @param pretty - Whether to format with indentation
 * @returns JSON string
 */
export function generateJSONReport(report: SessionReport, pretty: boolean = true): string {
  const output = {
    version: report.version,
    generated: report.generated,
    session: {
      id: report.session.id,
      url: report.session.url,
      duration: report.session.duration,
      timestamp: report.session.timestamp,
    },
    summary: {
      totalComponents: report.summary.totalComponents,
      totalRenders: report.summary.totalRenders,
      criticalIssues: report.summary.criticalIssues,
      warnings: report.summary.warnings,
      healthy: report.summary.healthy,
      avgFps: report.summary.avgFps,
      minFps: report.summary.minFps,
      unnecessaryRenders: report.summary.unnecessaryRenders,
    },
    components: report.components.map((comp) => ({
      name: comp.name,
      renders: comp.renders,
      expectedRenders: comp.expectedRenders,
      avgRenderTime: Math.round(comp.avgRenderTime * 100) / 100,
      maxRenderTime: Math.round(comp.maxRenderTime * 100) / 100,
      minRenderTime: comp.minRenderTime === Infinity ? 0 : Math.round(comp.minRenderTime * 100) / 100,
      totalRenderTime: Math.round(comp.totalRenderTime * 100) / 100,
      unnecessary: comp.unnecessary,
      severity: comp.severity,
      chain: comp.chain,
      parent: comp.parent ?? null,
      fixes: comp.fixes.map((fix) => ({
        severity: fix.severity,
        issue: fix.issue,
        cause: fix.cause,
        fix: fix.fix,
        explanation: fix.explanation,
        impact: fix.impact ?? null,
      })),
    })),
    chains: report.chains.map((chain) => ({
      trigger: chain.trigger,
      chain: chain.chain,
      depth: chain.depth,
      totalRenders: chain.totalRenders,
      rootCause: chain.rootCause,
      timestamp: chain.timestamp,
      isContextTriggered: chain.isContextTriggered,
    })),
    suggestions: report.suggestions.map((s) => ({
      componentName: s.componentName,
      severity: s.severity,
      issue: s.issue,
      cause: s.cause,
      fix: s.fix,
      codeBefore: s.codeBefore,
      codeAfter: s.codeAfter,
      explanation: s.explanation,
      impact: s.impact ?? null,
    })),
    framework: report.framework
      ? {
          name: report.framework.name,
          version: report.framework.version,
          features: report.framework.features,
          tips: report.framework.tips,
        }
      : null,
  };

  return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
}

/**
 * Parse a JSON report
 * @param json - JSON string
 * @returns Parsed session report
 */
export function parseJSONReport(json: string): SessionReport {
  const data = JSON.parse(json) as SessionReport;
  return data;
}

/**
 * Validate a JSON report structure
 * @param data - Parsed JSON data
 * @returns Validation errors (empty if valid)
 */
export function validateJSONReport(data: unknown): string[] {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Report must be an object');
    return errors;
  }

  const report = data as Record<string, unknown>;

  // Check required fields
  const required = ['version', 'generated', 'session', 'summary', 'components'];
  for (const field of required) {
    if (!(field in report)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate session
  if (report['session'] && typeof report['session'] === 'object') {
    const session = report['session'] as Record<string, unknown>;
    if (!session['url']) errors.push('session.url is required');
    if (typeof session['duration'] !== 'number') errors.push('session.duration must be a number');
  }

  // Validate summary
  if (report['summary'] && typeof report['summary'] === 'object') {
    const summary = report['summary'] as Record<string, unknown>;
    if (typeof summary['totalComponents'] !== 'number') errors.push('summary.totalComponents must be a number');
    if (typeof summary['totalRenders'] !== 'number') errors.push('summary.totalRenders must be a number');
  }

  // Validate components
  if (!Array.isArray(report['components'])) {
    errors.push('components must be an array');
  }

  return errors;
}
