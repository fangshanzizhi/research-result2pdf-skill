/**
 * PDF Reporter Skill - 一键安装脚本
 * 将本 skill 安装到 Kimi CLI 的 skills 目录
 *
 * 用法:
 *   git clone https://github.com/fangshanzizhi/research-result2pdf-skill.git
 *   cd research-result2pdf-skill
 *   node install.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_NAME = 'pdf-reporter';
const SOURCE_DIR = __dirname;

// 定位 Kimi CLI skills 目录
function getSkillsDir() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error('无法定位用户主目录，请设置 HOME 或 USERPROFILE 环境变量');
  }
  return path.join(home, '.kimi-code', 'skills');
}

const skillsDir = getSkillsDir();
const targetDir = path.join(skillsDir, SKILL_NAME);

// 颜色输出
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function log(msg) {
  console.log(`${C.cyan}[install]${C.reset} ${msg}`);
}

function ok(msg) {
  console.log(`${C.green}✓${C.reset} ${msg}`);
}

// ── 主流程 ──────────────────────────────────────────────────────

console.log(`${C.bold}${C.cyan}`);
console.log('╔══════════════════════════════════════════════╗');
console.log('║   PDF Reporter Skill - 安装                  ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`${C.reset}`);

// 1. 确保 skills 目录存在
if (!fs.existsSync(skillsDir)) {
  fs.mkdirSync(skillsDir, { recursive: true });
  log(`Created skills dir: ${skillsDir}`);
}

// 2. 安装方式：Windows 用 junction/linkd，Unix 用 symlink
const isWin = process.platform === 'win32';

if (fs.existsSync(targetDir)) {
  log(`Skill already exists at ${targetDir}, updating...`);
  // 删除旧链接/目录
  const stats = fs.lstatSync(targetDir);
  if (stats.isSymbolicLink() || stats.is Junction?.call(stats)) {
    fs.unlinkSync(targetDir);
  } else {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
}

try {
  if (isWin) {
    // Windows: 使用目录 junction（不需要管理员权限）
    execSync(`mklink /J "${targetDir}" "${SOURCE_DIR}"`, { stdio: 'pipe' });
  } else {
    // macOS/Linux: 使用符号链接
    fs.symlinkSync(SOURCE_DIR, targetDir);
  }
  ok(`Linked skill to ${targetDir}`);
} catch (e) {
  // 如果链接失败，退回到复制
  log(`Symlink failed (${e.message}), falling back to copy...`);
  copyDir(SOURCE_DIR, targetDir);
  ok(`Copied skill to ${targetDir}`);
}

// 3. 验证安装
const installedIndex = path.join(targetDir, 'index.js');
if (fs.existsSync(installedIndex)) {
  ok('Installation verified');
} else {
  console.error('Installation failed: index.js not found in target dir');
  process.exit(1);
}

console.log(`\n${C.bold}安装完成！${C.reset}`);
console.log(`  Skill 位置: ${targetDir}`);
console.log(`  使用方式: require('skill/pdf-reporter')`);
console.log(`\n${C.yellow}注意: 依赖采用懒加载模式，Agent 首次调用时会自动提示安装。${C.reset}`);

// ── 工具函数 ────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
