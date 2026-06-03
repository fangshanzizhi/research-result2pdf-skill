/**
 * PDF Reporter Skill - 环境初始化脚本（沙盒优先版）
 * 一键检查并安装所有依赖
 *
 * 用法:
 *   node setup.js              # 默认：创建沙盒并安装核心依赖（推荐）
 *   node setup.js --system     # 回退：安装到系统 Python（可能污染全局环境）
 *   node setup.js --check-only # 仅检查，不安装
 */

const { checkPythonEnv, getPython } = require('./compat');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const TDK_DIR = path.resolve(__dirname, './tech-diagram-kit');
const tdk = require(path.join(TDK_DIR, 'src/index.js'));

const CHECK_ONLY = process.argv.includes('--check-only');
const USE_SYSTEM = process.argv.includes('--system');

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
// 沙盒模式
// =====================================================================

async function setupSandboxMode() {
  section('沙盒模式初始化');

  if (tdk.isSandboxReady && tdk.isSandboxReady()) {
    const py = getPython();
    print('沙盒状态', 'OK', `Python: ${py}`);
    return { ok: true, sandbox: true };
  }

  if (CHECK_ONLY) {
    print('沙盒状态', 'FAIL', '沙盒未初始化');
    return { ok: false, sandbox: false };
  }

  try {
    await tdk.setupSandbox({ autoInstall: true, verbose: true });
    const py = getPython();
    print('沙盒初始化', 'OK', `Python: ${py}`);
    return { ok: true, sandbox: true };
  } catch (e) {
    print('沙盒初始化', 'FAIL', e.message);
    return { ok: false, sandbox: false, error: e.message };
  }
}

// =====================================================================
// 系统模式（回退）
// =====================================================================

function setupSystemMode() {
  section('系统 Python 模式');

  const pyInfo = checkPythonEnv();
  if (!pyInfo.ok) {
    print('Python 解释器', 'FAIL', pyInfo.error);
    return { ok: false, error: pyInfo.error };
  }
  print('Python 解释器', 'OK', `${pyInfo.python} (v${pyInfo.version})`);

  const REQUIRED_PACKAGES = [
    { name: 'reportlab', pipName: 'reportlab', required: true },
    { name: 'pymupdf', pipName: 'pymupdf', required: false },
    { name: 'matplotlib', pipName: 'matplotlib', required: true },
    { name: 'numpy', pipName: 'numpy', required: true },
  ];

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
    } else {
      process.stdout.write(`  → 正在安装 ${pkg.name} ... `);
      const ok = installPyPackage(pyInfo.python, pkg.pipName);
      if (ok) {
        print(pkg.name, 'OK', '已自动安装');
      } else {
        print(pkg.name, pkg.required ? 'FAIL' : 'WARN', '安装失败，请手动执行 pip install');
      }
    }
  }

  return { ok: true, sandbox: false };
}

// =====================================================================
// 可选依赖检查
// =====================================================================

function checkOptionalDeps() {
  section('可选依赖');

  if (tdk.requireDependencyList) {
    const list = tdk.requireDependencyList();
    for (const tier of list.tiers) {
      if (tier.tier === 0) continue; // 核心已在上面检查
      for (const dep of tier.deps) {
        const status = dep.installed ? 'OK' : 'WARN';
        const detail = dep.installed ? `(${dep.source})` : '未安装';
        print(dep.name, status, detail);
      }
    }
  }

  // Node.js 依赖（仅检查系统全局，沙盒已在上面覆盖）
  const NODE_DEPS = ['mathjax-node'];
  for (const dep of NODE_DEPS) {
    try {
      require.resolve(dep);
      print(dep, 'OK', '(system)');
    } catch {
      print(dep, 'WARN', '未安装（math 公式将使用 Python fallback）');
    }
  }
}

// =====================================================================
// 主流程
// =====================================================================

(async () => {
  console.log(`${C.bold}${C.cyan}`);
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   PDF Reporter Skill - 环境初始化            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  let result;

  if (USE_SYSTEM) {
    console.log(`${C.yellow}模式: 系统 Python（可能污染全局环境）${C.reset}`);
    result = setupSystemMode();
  } else {
    console.log(`${C.green}模式: 沙盒隔离（推荐）${C.reset}`);
    result = await setupSandboxMode();
  }

  // TDK 目录
  section('Tech Diagram Kit (TDK)');
  if (fs.existsSync(TDK_DIR)) {
    print('TDK 目录', 'OK', TDK_DIR);
    const tdkIndex = path.join(TDK_DIR, 'src/index.js');
    if (fs.existsSync(tdkIndex)) {
      print('TDK 入口文件', 'OK');
    } else {
      print('TDK 入口文件', 'FAIL', `${tdkIndex} 不存在`);
    }
  } else {
    print('TDK 目录', 'FAIL', `${TDK_DIR} 不存在`);
  }

  // 可选依赖
  checkOptionalDeps();

  // 总结
  console.log(`\n${C.bold}${'='.repeat(50)}${C.reset}`);

  if (!result.ok) {
    console.log(`${C.red}${C.bold}✗ 初始化未完成${C.reset}`);
    if (result.error) {
      console.log(`  ${C.red}${result.error}${C.reset}`);
    }
    console.log(`\n${C.cyan}建议:${C.reset}`);
    console.log(`  1. 安装 Python 3.8+ 并确保在 PATH 中`);
    console.log(`  2. 重新运行: node setup.js`);
    process.exit(1);
  }

  console.log(`${C.green}${C.bold}✓ 初始化完成${C.reset}`);
  if (result.sandbox) {
    console.log(`  沙盒路径: .pdf-reporter/`);
    console.log(`  沙盒 Python: ${getPython()}`);
  }
  console.log(`\n${C.cyan}下一步:${C.reset}`);
  console.log(`  1. 参考 templates/report-spec.example.json 了解输入格式`);
  console.log(`  2. 调用 generatePdf() 生成 PDF（自动使用沙盒环境）`);
})();
