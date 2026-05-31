/**
 * PDF Reporter Skill - 环境初始化脚本
 * 一键检查并安装所有依赖
 *
 * 用法:
 *   node setup.js              # 检查并安装
 *   node setup.js --check-only # 仅检查，不安装
 */

const { checkPythonEnv, getPython } = require('./compat');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const CHECK_ONLY = process.argv.includes('--check-only');

// 颜色输出
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function print(label, status, detail = '') {
  const icon = status === 'OK' ? `${C.green}✓${C.reset}` :
               status === 'WARN' ? `${C.yellow}⚠${C.reset}` :
               `${C.red}✗${C.reset}`;
  const color = status === 'OK' ? C.green : status === 'WARN' ? C.yellow : C.red;
  console.log(`  ${icon} ${label.padEnd(30)} ${color}${status}${C.reset}  ${detail}`);
}

function section(title) {
  console.log(`\n${C.bold}${C.cyan}▶ ${title}${C.reset}`);
}

function installPyPackage(python, pkg) {
  try {
    execSync(`"${python}" -m pip install ${pkg}`, {
      stdio: CHECK_ONLY ? 'pipe' : 'inherit',
      timeout: 120000,
    });
    return true;
  } catch {
    return false;
  }
}

// =====================================================================
// 主流程
// =====================================================================

console.log(`${C.bold}${C.cyan}`);
console.log('╔══════════════════════════════════════════════╗');
console.log('║   PDF Reporter Skill - 环境初始化            ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`${C.reset}`);

let hasErrors = false;
let hasWarnings = false;

// ── 1. Python 环境 ──────────────────────────────────────────────
section('Python 环境');

const pyInfo = checkPythonEnv();
if (!pyInfo.ok) {
  print('Python 解释器', 'FAIL', pyInfo.error);
  hasErrors = true;
} else {
  print('Python 解释器', 'OK', `${pyInfo.python} (v${pyInfo.version})`);
}

// ── 2. Python 包 ────────────────────────────────────────────────
section('Python 依赖包');

const REQUIRED_PACKAGES = [
  { name: 'reportlab', pipName: 'reportlab', required: true },
  { name: 'pymupdf', pipName: 'pymupdf', required: false },
  { name: 'matplotlib', pipName: 'matplotlib', required: true },
  { name: 'numpy', pipName: 'numpy', required: true },
];

if (pyInfo.ok) {
  for (const pkg of REQUIRED_PACKAGES) {
    const isInstalled = pyInfo.packages[pkg.name] !== undefined
      ? pyInfo.packages[pkg.name]
      : (() => {
          try {
            execSync(`"${pyInfo.python}" -c "import ${pkg.name}"`, { stdio: 'pipe', timeout: 5000 });
            return true;
          } catch { return false; }
        })();

    if (isInstalled) {
      print(pkg.name, 'OK');
    } else if (CHECK_ONLY) {
      print(pkg.name, pkg.required ? 'FAIL' : 'WARN', '未安装');
      if (pkg.required) hasErrors = true;
      else hasWarnings = true;
    } else {
      process.stdout.write(`  → 正在安装 ${pkg.name} ... `);
      const ok = installPyPackage(pyInfo.python, pkg.pipName);
      if (ok) {
        print(pkg.name, 'OK', '已自动安装');
      } else {
        print(pkg.name, pkg.required ? 'FAIL' : 'WARN', '安装失败，请手动执行 pip install');
        if (pkg.required) hasErrors = true;
        else hasWarnings = true;
      }
    }
  }
}

// ── 3. TDK 目录 ─────────────────────────────────────────────────
section('Tech Diagram Kit (TDK)');

const TDK_DIR = path.resolve(__dirname, '../../tech-diagram-kit');
if (fs.existsSync(TDK_DIR)) {
  print('TDK 目录', 'OK', TDK_DIR);
  const tdkIndex = path.join(TDK_DIR, 'src/index.js');
  if (fs.existsSync(tdkIndex)) {
    print('TDK 入口文件', 'OK');
  } else {
    print('TDK 入口文件', 'FAIL', `${tdkIndex} 不存在`);
    hasErrors = true;
  }
} else {
  print('TDK 目录', 'FAIL', `${TDK_DIR} 不存在`);
  console.log(`  ${C.yellow}提示: TDK 应与 pdf-reporter 在同一仓库中${C.reset}`);
  hasErrors = true;
}

// ── 4. 输出目录 ─────────────────────────────────────────────────
section('工作目录');

const reportsDir = path.resolve(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) {
  if (!CHECK_ONLY) {
    fs.mkdirSync(reportsDir, { recursive: true });
    print('reports/', 'OK', '已自动创建');
  } else {
    print('reports/', 'WARN', '目录不存在（运行 setup.js 可自动创建）');
    hasWarnings = true;
  }
} else {
  print('reports/', 'OK');
}

// ── 5. Node 依赖（TDK 子依赖）───────────────────────────────────
section('Node.js 依赖');

const NODE_DEPS = ['mathjax-node'];
for (const dep of NODE_DEPS) {
  try {
    require.resolve(dep);
    print(dep, 'OK');
  } catch {
    print(dep, 'WARN', '未安装（math 公式将使用 Python fallback）');
    hasWarnings = true;
  }
}

// ── 6. 可选 CLI 工具 ────────────────────────────────────────────
section('可选 CLI 工具（提升图表渲染能力）');

const CLI_TOOLS = [
  { name: 'mermaid-cli', check: 'mmdc --version', guide: 'npm install -g @mermaid-js/mermaid-cli' },
  { name: 'd2', check: 'd2 --version', guide: '见 https://d2lang.com/tour/install' },
  { name: 'graphviz', check: 'dot -V', guide: '见 https://graphviz.org/download/' },
];

for (const tool of CLI_TOOLS) {
  try {
    execSync(tool.check, { stdio: 'pipe', timeout: 5000 });
    print(tool.name, 'OK');
  } catch {
    print(tool.name, 'WARN', `未安装 → ${tool.guide}`);
    hasWarnings = true;
  }
}

// ── 总结 ────────────────────────────────────────────────────────
console.log(`\n${C.bold}${'='.repeat(50)}${C.reset}`);

if (hasErrors) {
  console.log(`${C.red}${C.bold}✗ 初始化未完成，存在必需依赖缺失${C.reset}`);
  console.log(`  请修复上述 ${C.red}FAIL${C.reset} 项后重新运行`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${C.yellow}${C.bold}⚠ 初始化完成，部分可选功能不可用${C.reset}`);
  console.log(`  报告生成核心功能已就绪，可选图表渲染器可按需安装`);
} else {
  console.log(`${C.green}${C.bold}✓ 初始化全部通过${C.reset}`);
  console.log(`  PDF Reporter Skill 已就绪，可直接调用 generatePdf()`);
}

console.log(`\n${C.cyan}下一步:${C.reset}`);
console.log(`  1. 参考 templates/report-spec.example.json 了解输入格式`);
console.log(`  2. 在工作目录创建报告描述 JSON，调用 skill 生成 PDF`);
console.log(`  3. 生成的 PDF 默认保存到 reports/ 目录`);
