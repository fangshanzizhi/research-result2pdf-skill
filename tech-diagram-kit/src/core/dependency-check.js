/**
 * 依赖可用性检查（沙盒优先 + 系统回退版）
 * 检查 Node CLI 工具和 Python 包是否已安装
 * 优先级: 沙盒 > 系统（Tier 0 包优先沙盒；Tier 1+ 包回退系统）
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { InstallGuide } = require('../utils/errors');
const { getPython, findInSandbox, getSandboxPython, getSandboxNodeBin, findSystemPython } = require('./sandbox');

function which(cmd) {
  const isWin = process.platform === 'win32';

  // 1. 优先查找沙盒 node_modules/.bin/
  const nodeBin = getSandboxNodeBin();
  const nodePaths = [
    path.join(nodeBin, cmd + (isWin ? '.exe' : '')),
    path.join(nodeBin, cmd + (isWin ? '.cmd' : '')),
    path.join(nodeBin, cmd),
  ];
  for (const p of nodePaths) {
    if (fs.existsSync(p)) return true;
  }

  // 2. 再查找沙盒 bin/
  const sandboxPath = findInSandbox(cmd);
  if (sandboxPath) return true;

  // 3. 最后查找系统 PATH
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function pythonImport(pkg) {
  // 1. 先查沙盒
  const sandboxPy = getSandboxPython();
  if (sandboxPy) {
    try {
      execSync(`"${sandboxPy}" -c "import ${pkg}"`, { stdio: 'pipe', shell: process.platform === 'win32', timeout: 5000 });
      return true;
    } catch { /* 沙盒没有，继续查系统 */ }
  }

  // 2. 回退到系统 Python
  const sysPy = findSystemPython();
  if (sysPy) {
    try {
      execSync(`"${sysPy}" -c "import ${pkg}"`, { stdio: 'pipe', shell: process.platform === 'win32', timeout: 5000 });
      return true;
    } catch { /* ignore */ }
  }

  return false;
}

const CHECKERS = {
  mermaid:    () => which('mmdc'),
  d2:         () => which('d2'),
  plantuml:   () => which('plantuml') || which('java'),
  graphviz:   () => which('dot'),
  markmap:    () => which('markmap'),
  mathjax:    () => {
    // 先查沙盒 node_modules
    const localPath = path.join(getSandboxNodeBin(), '..', 'mathjax-node');
    if (fs.existsSync(localPath)) return true;
    try { require('mathjax-node'); return true; } catch { return false; }
  },
  vegalite:   () => { try { require('vega-lite'); return true; } catch { return false; } },
  matplotlib: () => pythonImport('matplotlib'),
  mpl_diagram:() => pythonImport('matplotlib'),
  latex_math: () => pythonImport('matplotlib'),
  rdkit:      () => pythonImport('rdkit'),
  schemdraw:  () => pythonImport('schemdraw'),
  tikz:       () => which('pdflatex'),
  pymupdf:    () => pythonImport('fitz'),
  reportlab:  () => pythonImport('reportlab'),
};

function check(name) {
  const checker = CHECKERS[name];
  if (!checker) return { available: false, known: false };
  const available = checker();
  return {
    available,
    known: true,
    name,
    guide: available ? null : (InstallGuide[name] || null)
  };
}

function checkAll() {
  const results = {};
  for (const name of Object.keys(CHECKERS)) {
    results[name] = check(name);
  }
  return results;
}

function checkAny(names) {
  for (const name of names) {
    const r = check(name);
    if (r.available) return r;
  }
  return { available: false, name: names.join('|'), guide: InstallGuide[names[0]] };
}

// CLI 入口
if (require.main === module) {
  const results = checkAll();
  console.log('=== Tech Diagram Kit 依赖检查 ===\n');
  for (const [name, r] of Object.entries(results)) {
    const status = r.available ? '✅' : '❌';
    console.log(`${status} ${name.padEnd(12)} ${r.available ? '可用' : '未安装'}`);
    if (!r.available && r.guide) {
      console.log(`   安装: ${r.guide.cmd}`);
    }
  }
}

module.exports = { check, checkAll, checkAny, CHECKERS };
