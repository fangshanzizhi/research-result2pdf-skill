/**
 * 图表类型扩展端到端集成测试
 * 需要真实 Python 环境，不可用时自动 skip
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const { generatePdf } = require('../../index');
const { checkPythonEnv } = require('../../compat');

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

describe('图表类型扩展集成测试', () => {
  let outputDir;

  beforeAll(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reporter-graph-ext-'));
  });

  afterAll(() => {
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  // =====================================================================
  // G-001: listChartTypes 返回 33 种类型
  // =====================================================================
  test('G-001: listChartTypes 返回 33 种类型和 9 个领域', () => {
    const { listChartTypes } = require('../../index');
    const result = listChartTypes();
    expect(result.types.length).toBeGreaterThanOrEqual(33);
    expect(Object.keys(result.typesByDomain).length).toBeGreaterThanOrEqual(9);
    expect(result.typesByDomain.physics).toBeDefined();
    expect(result.typesByDomain.physics.some(t => t.chartType === 'circuit')).toBe(true);
  });

  // =====================================================================
  // G-002/G-003: physics.circuit 渲染
  // =====================================================================
  testOrSkip('G-002: physics.circuit basic 类型渲染', async () => {
    const outputPath = path.join(outputDir, 'g002_circuit_basic.pdf');
    const result = await generatePdf({
      context: '电路图测试',
      struct: [
        { type: 'heading', text: 'RC电路', level: 1 },
        { type: 'diagram', ref: 'c1', layout: 'halfwidth', caption: 'RC滤波电路' },
      ],
      desc: [
        { id: 'c1', domain: 'physics', chartType: 'circuit', input: { circuitType: 'basic' } },
      ],
      outputPath,
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.images).toBeGreaterThanOrEqual(1);
  });

  testOrSkip('G-003: physics.circuit custom 类型渲染', async () => {
    const outputPath = path.join(outputDir, 'g003_circuit_custom.pdf');
    const result = await generatePdf({
      context: '自定义电路测试',
      struct: [
        { type: 'heading', text: '自定义电路', level: 1 },
        { type: 'diagram', ref: 'c2', layout: 'halfwidth', caption: '自定义RL电路' },
      ],
      desc: [
        {
          id: 'c2',
          domain: 'physics',
          chartType: 'circuit',
          input: {
            circuitType: 'custom',
            elements: [{ type: 'SourceV', label: 'Vcc' }, { type: 'Resistor', label: 'R1' }, { type: 'Inductor', label: 'L1' }],
          },
        },
      ],
      outputPath,
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.images).toBeGreaterThanOrEqual(1);
  });

  // =====================================================================
  // G-005: 向后兼容
  // =====================================================================
  testOrSkip('G-005: 原有 cs.flowchart 行为不变', async () => {
    const outputPath = path.join(outputDir, 'g005_compat.pdf');
    const result = await generatePdf({
      context: '向后兼容测试',
      struct: [
        { type: 'heading', text: '流程', level: 1 },
        { type: 'diagram', ref: 'f1', layout: 'fullwidth', caption: '流程图' },
      ],
      desc: [
        { id: 'f1', domain: 'cs', chartType: 'flowchart', input: { dsl: 'flowchart LR\nA-->B' } },
      ],
      outputPath,
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
  });

  // =====================================================================
  // G-006: 渲染失败容错
  // =====================================================================
  testOrSkip('G-006: 新增类型渲染失败容错', async () => {
    const outputPath = path.join(outputDir, 'g006_fail.pdf');
    const result = await generatePdf({
      context: '容错测试',
      struct: [
        { type: 'diagram', ref: 'bad', layout: 'halfwidth', caption: '无效电路' },
        { type: 'paragraph', text: '后文段落' },
      ],
      desc: [
        { id: 'bad', domain: 'physics', chartType: 'circuit', input: { circuitType: 'invalid_type_xyz' } },
      ],
      outputPath,
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.images).toBe(0);
  });

  // =====================================================================
  // G-008: 默认路径生成 summary
  // =====================================================================
  testOrSkip('G-008: 默认路径生成 summary 文件名', async () => {
    const originalCwd = process.cwd();
    process.chdir(outputDir);

    const result = await generatePdf({
      context: 'PCB技术原理调研报告',
      struct: [{ type: 'heading', text: '测试', level: 1 }],
    });

    expect(result.success).toBe(true);
    expect(path.basename(result.path)).toBe('PCB技术原理调研报告.pdf');
    expect(fs.existsSync(result.path)).toBe(true);

    process.chdir(originalCwd);
  });

  // =====================================================================
  // G-009: PCB 模拟场景
  // =====================================================================
  testOrSkip('G-009: PCB 模拟场景完整报告', async () => {
    const fixture = require('../fixtures/pcb-mixed.json');
    const outputPath = path.join(outputDir, 'g009_pcb_report.pdf');

    const result = await generatePdf({
      ...fixture,
      outputPath,
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.size).toBeGreaterThan(0);
    expect(result.images).toBeGreaterThanOrEqual(1);
  // timeout 30s: PCB 场景含 fig_flow/fig_arch，在 mermaid/d2 均未安装时
  // fallback 链遍历耗时较长（环境相关，非代码缺陷）
  }, 30000);

  // =====================================================================
  // G-010: 追加模式与新增类型共存
  // =====================================================================
  // timeout 30s: 两次 generatePdf 调用，每次含 circuit 渲染（沙盒→系统回退）
  testOrSkip('G-010: 追加模式与新增类型共存', async () => {
    const basePath = path.join(outputDir, 'g010_append.pdf');

    // 第一次生成
    const r1 = await generatePdf({
      context: '追加测试第一部分',
      struct: [
        { type: 'heading', text: '第一章', level: 1 },
        { type: 'diagram', ref: 'c1', layout: 'halfwidth', caption: '电路1' },
      ],
      desc: [{ id: 'c1', domain: 'physics', chartType: 'circuit', input: { circuitType: 'basic' } }],
      outputPath: basePath,
    });
    expect(r1.success).toBe(true);
    const size1 = r1.size;

    // 第二次追加
    const r2 = await generatePdf({
      context: '追加测试第二部分',
      struct: [
        { type: 'heading', text: '第二章', level: 1 },
        { type: 'diagram', ref: 'c2', layout: 'halfwidth', caption: '电路2' },
      ],
      desc: [{ id: 'c2', domain: 'physics', chartType: 'circuit', input: { circuitType: 'basic' } }],
      outputPath: basePath,
    });
    expect(r2.success).toBe(true);
    expect(r2.path).toBe(basePath);
    expect(r2.size).toBeGreaterThan(size1);
  }, 30000);
});
