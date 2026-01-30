#!/usr/bin/env node
/**
 * Reads CodeQL SARIF file(s) and generates an HTML report.
 * Config: .github/codeql/codeql-config.yml (html-report.sarif-dir, html-report.output).
 * Usage: node codeql-sarif-to-html.js [config.yml]   (default: same-dir codeql-config.yml)
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = path.resolve(path.dirname(process.argv[1] || '.'));

function readHtmlReportConfig(configPath) {
  const p = configPath || path.join(SCRIPT_DIR, 'codeql-config.yml');
  if (!fs.existsSync(p)) return null;
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split(/\r?\n/);
  let inHtmlReport = false;
  const config = {};
  for (const line of lines) {
    if (/^html-report\s*:/.test(line.trim())) {
      inHtmlReport = true;
      continue;
    }
    if (inHtmlReport) {
      const topLevel = /^\w/.test(line) && !line.startsWith(' ');
      if (topLevel && !line.trim().startsWith('#')) break;
      const m = line.match(/^\s*sarif-dir\s*:\s*(.+)/);
      if (m) config.sarifDir = m[1].trim();
      const m2 = line.match(/^\s*output\s*:\s*(.+)/);
      if (m2) config.output = m2[1].trim();
    }
  }
  return config.sarifDir && config.output ? config : null;
}

function findSarifFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) files.push(...findSarifFiles(full));
    else if (name.endsWith('.sarif')) files.push(full);
  }
  return files;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getLevel(result) {
  return result.level || result.rule?.defaultConfiguration?.level || 'warning';
}

function getMessage(result) {
  const msg = result.message;
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  return msg.text || (msg.markdown && msg.markdown.replace(/<[^>]+>/g, '')) || '';
}

function getLocation(result) {
  const loc = result.locations?.[0]?.physicalLocation;
  if (!loc) return '-';
  const file = loc.artifactLocation?.uri || '-';
  const region = loc.region;
  if (region) {
    const part = `${region.startLine || '-'}${region.startColumn != null ? ':' + region.startColumn : ''}`;
    return escapeHtml(file) + ':' + part;
  }
  return escapeHtml(file);
}

function getRuleId(result) {
  return result.ruleId || result.rule?.id || '-';
}

function collectResults(sarifDir) {
  const rows = [];
  const files = findSarifFiles(sarifDir);
  for (const file of files) {
    try {
      const sarif = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const run of sarif.runs || []) {
        const ruleMap = {};
        for (const r of run.tool?.driver?.rules || []) ruleMap[r.id] = r;
        for (const result of run.results || []) {
          const rule = ruleMap[result.ruleId];
          rows.push({
            ruleId: getRuleId(result),
            level: getLevel(result),
            message: getMessage(result),
            location: getLocation(result),
            name: rule?.shortDescription?.text || result.ruleId,
          });
        }
      }
    } catch (e) {
      rows.push({ ruleId: '-', level: 'error', message: String(e.message), location: file, name: 'Parse error' });
    }
  }
  const order = { error: 0, warning: 1, note: 2 };
  rows.sort((a, b) => (order[a.level] ?? 3) - (order[b.level] ?? 3));
  return rows;
}

function generateHtml(rows) {
  const levelClass = { error: 'critical', warning: 'high', note: 'medium' };
  const levelLabel = { error: 'Error', warning: 'Warning', note: 'Note' };
  const trs = rows
    .map(
      (r) =>
        `<tr class="${levelClass[r.level] || 'low'}"><td>${escapeHtml(r.ruleId)}</td><td>${levelLabel[r.level] || r.level}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.message)}</td><td><code>${r.location}</code></td></tr>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CodeQL Security Report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #1e1e1e; color: #d4d4d4; }
    h1 { color: #fff; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #444; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #2d2d2d; color: #fff; }
    tr.critical { background: #3d1f1f; }
    tr.high    { background: #3d2f1f; }
    tr.medium  { background: #2f3d1f; }
    tr.low     { background: #1f2f3d; }
    code { font-size: 0.9em; background: #333; padding: 0.2em 0.4em; border-radius: 3px; }
    .meta { color: #888; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>CodeQL Security Report</h1>
  <p class="meta">Generated from CodeQL analysis. ${rows.length} finding(s).</p>
  <table>
    <thead><tr><th>Rule ID</th><th>Severity</th><th>Rule</th><th>Message</th><th>Location</th></tr></thead>
    <tbody>${trs || '<tr><td colspan="5">No results.</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

// Resolve paths from config (relative to repo root when run from workflow)
const configPath = process.argv[2] && process.argv[2].endsWith('.yml') ? process.argv[2] : null;
const config = readHtmlReportConfig(configPath);
const sarifDir = config ? config.sarifDir : process.argv[2] || 'codeql-results';
const outFile = config ? config.output : process.argv[3] || 'codeql-report.html';

const rows = collectResults(sarifDir);
fs.writeFileSync(outFile, generateHtml(rows), 'utf8');
console.log(`Wrote ${rows.length} result(s) to ${outFile}`);
