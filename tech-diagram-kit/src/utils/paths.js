/**
 * 路径工具
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const TEMP_DIR = path.join(PROJECT_ROOT, 'temp');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const RENDERERS_PY_DIR = path.join(PROJECT_ROOT, 'src/renderers/py');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeTempPath(ext = '.png') {
  ensureDir(TEMP_DIR);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return path.join(TEMP_DIR, `tdk_${ts}_${rand}${ext}`);
}

function resolveOutputPath(givenPath, domain, type, format) {
  if (givenPath) {
    ensureDir(path.dirname(givenPath));
    return givenPath;
  }
  ensureDir(OUTPUT_DIR);
  const ts = Date.now();
  return path.join(OUTPUT_DIR, `${domain}_${type}_${ts}.${format}`);
}

function cleanupTemp() {
  if (!fs.existsSync(TEMP_DIR)) return;
  const files = fs.readdirSync(TEMP_DIR);
  for (const f of files) {
    try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch (e) { /* ignore */ }
  }
}

module.exports = {
  PROJECT_ROOT, TEMP_DIR, DOCS_DIR, OUTPUT_DIR, RENDERERS_PY_DIR,
  ensureDir, makeTempPath, resolveOutputPath, cleanupTemp
};
