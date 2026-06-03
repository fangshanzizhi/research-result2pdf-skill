/**
 * generatePdf 端到端功能测试
 * 需要真实 Python 3.8+ 环境和 reportlab 包
 * 环境不可用时自动 skip
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const { generatePdf } = require('../../index');
const { checkPythonEnv } = require('../../compat');

// 检测真实环境是否可用
function checkRealEnv() {
  try {
    const env = checkPythonEnv();
    return env.ok && env.packages && env.packages.reportlab;
  } catch {
    return false;
  }
}

const hasRealEnv = checkRealEnv();
const testOrSkip = hasRealEnv ? test : test.skip;

describe('generatePdf 端到端功能测试', () => {
  let outputDir;

  beforeAll(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-e2e-'));
  });

  afterAll(() => {
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // 清理本次测试生成的文件
    if (outputDir && fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      for (const f of files) {
        fs.rmSync(path.join(outputDir, f), { recursive: true, force: true });
      }
    }
  });

  // =====================================================================
  // F-001: 生成最小报告（无图表）
  // =====================================================================
  testOrSkip('F-001: 生成最小报告（无图表）', async () => {
    const fixture = require('../fixtures/no-chart.json');
    const outputPath = path.join(outputDir, 'f001_minimal.pdf');

    const result = await generatePdf({
      ...fixture,
      outputPath,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.size).toBeGreaterThan(0);
    expect(result.pages).toBeGreaterThanOrEqual(1);
  });

  // =====================================================================
  // F-002: 生成含图表的报告
  // =====================================================================
  testOrSkip('F-002: 生成含图表的报告', async () => {
    const fixture = require('../fixtures/with-chart.json');
    const outputPath = path.join(outputDir, 'f002_with_chart.pdf');

    const result = await generatePdf({
      ...fixture,
      outputPath,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.size).toBeGreaterThan(0);
    expect(result.images).toBeGreaterThanOrEqual(1);
  });

  // =====================================================================
  // F-003: 自定义输出路径
  // =====================================================================
  testOrSkip('F-003: 自定义输出路径', async () => {
    const nestedDir = path.join(outputDir, 'nested', 'path');
    fs.mkdirSync(nestedDir, { recursive: true });
    const outputPath = path.join(nestedDir, 'custom.pdf');

    const result = await generatePdf({
      context: '自定义路径测试',
      struct: [{ type: 'heading', text: 'Test', level: 1 }],
      outputPath,
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  // =====================================================================
  // F-004: 默认输出路径与命名
  // =====================================================================
  testOrSkip('F-004: 默认输出路径与命名', async () => {
    // 在 outputDir 下模拟默认 pdf/ 目录
    const originalCwd = process.cwd();
    process.chdir(outputDir);

    try {
      const result = await generatePdf({
        context: '光模块',
        struct: [{ type: 'heading', text: 'Test', level: 1 }],
      });

      expect(result.success).toBe(true);
      expect(result.path).toContain('光模块.pdf');
      expect(fs.existsSync(result.path)).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  // =====================================================================
  // F-005: 文件名冲突自动递增
  // =====================================================================
  testOrSkip('F-005: 文件名冲突自动递增', async () => {
    const originalCwd = process.cwd();
    process.chdir(outputDir);

    try {
      // 第一次生成
      const r1 = await generatePdf({
        context: '冲突测试',
        struct: [{ type: 'heading', text: 'Test', level: 1 }],
      });
      expect(fs.existsSync(r1.path)).toBe(true);

      // 第二次生成（同名）
      const r2 = await generatePdf({
        context: '冲突测试',
        struct: [{ type: 'heading', text: 'Test2', level: 1 }],
      });
      expect(r2.path).toContain('_1.pdf');
      expect(fs.existsSync(r2.path)).toBe(true);

      // 第三次
      const r3 = await generatePdf({
        context: '冲突测试',
        struct: [{ type: 'heading', text: 'Test3', level: 1 }],
      });
      expect(r3.path).toContain('_2.pdf');
      expect(fs.existsSync(r3.path)).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  // =====================================================================
  // F-006: 多图表混排
  // =====================================================================
  testOrSkip('F-006: 多图表混排', async () => {
    const fixture = require('../fixtures/mixed.json');
    const outputPath = path.join(outputDir, 'f006_mixed.pdf');

    const result = await generatePdf({
      ...fixture,
      outputPath,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.size).toBeGreaterThan(0);
    expect(result.images).toBeGreaterThanOrEqual(1);
  });

  // =====================================================================
  // F-007: 图表渲染失败容错
  // =====================================================================
  testOrSkip('F-007: 图表渲染失败容错', async () => {
    const fixture = require('../fixtures/fail-chart.json');
    const outputPath = path.join(outputDir, 'f007_fail_chart.pdf');

    const result = await generatePdf({
      ...fixture,
      desc: [{ id: 'bad', domain: 'invalid_domain', chartType: 'invalid_type', input: {} }],
      outputPath,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.size).toBeGreaterThan(0);
    expect(result.images).toBe(0); // 失败图表不计入
  });

  // =====================================================================
  // F-008: 页数读取（pymupdf）
  // =====================================================================
  testOrSkip('F-008: 页数读取（pymupdf）', async () => {
    const fixture = require('../fixtures/no-chart.json');
    const outputPath = path.join(outputDir, 'f008_pages.pdf');

    const result = await generatePdf({
      ...fixture,
      outputPath,
    });

    expect(result.success).toBe(true);
    if (result.pages !== null) {
      expect(typeof result.pages).toBe('number');
      expect(result.pages).toBeGreaterThanOrEqual(1);
    }
  });

  // =====================================================================
  // F-011: PDF 追加模式（新增）
  // =====================================================================
  testOrSkip('F-011: PDF 追加模式', async () => {
    const basePath = path.join(outputDir, 'append_test.pdf');

    // 第一次生成
    const r1 = await generatePdf({
      context: '追加测试第一部分',
      struct: [
        { type: 'heading', text: '第一章', level: 1 },
        { type: 'paragraph', text: '这是第一部分内容。' },
      ],
      outputPath: basePath,
    });
    expect(r1.success).toBe(true);
    expect(fs.existsSync(r1.path)).toBe(true);
    const size1 = r1.size;
    const pages1 = r1.pages;

    // 第二次以相同路径生成（应追加）
    const r2 = await generatePdf({
      context: '追加测试第二部分',
      struct: [
        { type: 'heading', text: '第二章', level: 1 },
        { type: 'paragraph', text: '这是第二部分内容。' },
      ],
      outputPath: basePath,
    });
    expect(r2.success).toBe(true);
    expect(r2.path).toBe(basePath);
    expect(r2.size).toBeGreaterThan(size1);
    if (pages1 !== null && r2.pages !== null) {
      expect(r2.pages).toBeGreaterThan(pages1);
    }
  });

  // =====================================================================
  // F-010: 复杂文件名安全处理
  // =====================================================================
  testOrSkip('F-010: 复杂文件名安全处理', async () => {
    const originalCwd = process.cwd();
    process.chdir(outputDir);

    try {
      const result = await generatePdf({
        context: 'A/B<C>:D',
        struct: [{ type: 'heading', text: 'Test', level: 1 }],
      });

      expect(result.success).toBe(true);
      const basename = path.basename(result.path);
      expect(basename).not.toContain('/');
      expect(basename).not.toContain('<');
      expect(basename).not.toContain('>');
      expect(basename).not.toContain(':');
      expect(fs.existsSync(result.path)).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
