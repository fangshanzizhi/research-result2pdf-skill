/**
 * 依赖可用性检查
 * 检查 Node CLI 工具和 Python 包是否已安装
 */
const { execSync } = require('child_process');
const { InstallGuide } = require('../utils/errors');

function which(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function findPython() {
  if (process.env.TDK_PYTHON) return process.env.TDK_PYTHON;
  if (process.platform === 'win32') {
    const candidates = [
      'D:\\ProgramFiles\\Anaconda3\\envs\\fintech2\\python.exe',
      'C:\\Users\\lenovo\\Anaconda3\\python.exe',
    ];
    for (const c of candidates) {
      try { require('fs').accessSync(c); return c; } catch {}
    }
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

function pythonImport(pkg) {
  try {
    const py = findPython();
    execSync(`${py} -c "import ${pkg}"`, { stdio: 'pipe', shell: process.platform === 'win32' });
    return true;
  } catch {
    return false;
  }
}

const CHECKERS = {
  mermaid:    () => which('mmdc'),
  d2:         () => which('d2'),
  plantuml:   () => which('plantuml') || which('java'),
  graphviz:   () => which('dot'),
  markmap:    () => which('markmap'),
  mathjax:    () => { try { require('mathjax-node'); return true; } catch { return false; } },
  vegalite:   () => { try { require('vega-lite'); return true; } catch { return false; } },
  matplotlib: () => pythonImport('matplotlib'),
  mpl_diagram:() => pythonImport('matplotlib'),   // 同 matplotlib
  latex_math: () => pythonImport('matplotlib'),    // 依赖 matplotlib.mathtext
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
