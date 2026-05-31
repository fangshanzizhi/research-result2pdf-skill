/**
 * 调度引擎 - 统一渲染入口
 */
const { checkAny } = require('./dependency-check');
const { callPython } = require('./adapter');
const { resolveOutputPath } = require('../utils/paths');
const { TdkError, ErrorCode } = require('../utils/errors');

// ========================================================================
// 渲染器注册表
// ========================================================================
const REGISTRY = {
  // 化学
  'chemistry.molecule':     { renderer: 'rdkit',       fallback: null,        lang: 'python', formats: ['png','svg'] },
  'chemistry.equation':     { renderer: 'latex_math',  fallback: 'mathjax',   lang: 'python', formats: ['png','svg'] },
  
  // 物理
  'physics.formula':        { renderer: 'mathjax',     fallback: 'latex_math',lang: 'node',   formats: ['svg','png'] },
  'physics.banddiagram':    { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png','pdf'] },
  'physics.field':          { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png','pdf'] },
  
  // 数学
  'math.formula':           { renderer: 'mathjax',     fallback: 'latex_math',lang: 'node',   formats: ['svg','png'] },
  'math.geometry':          { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png','pdf'] },
  'math.function':          { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png','pdf'] },
  
  // 计算机/软件工程
  'cs.uml':                 { renderer: 'plantuml',    fallback: 'mermaid',   lang: 'node',   formats: ['png','svg'] },
  'cs.architecture':        { renderer: 'mermaid',     fallback: 'd2',        lang: 'node',   formats: ['svg','png'] },
  'cs.er':                  { renderer: 'mermaid',     fallback: 'd2',        lang: 'node',   formats: ['svg','png'] },
  'cs.statemachine':        { renderer: 'mermaid',     fallback: 'd2',        lang: 'node',   formats: ['svg','png'] },
  'cs.flowchart':           { renderer: 'mermaid',     fallback: 'd2',        lang: 'node',   formats: ['svg','png'] },
  'cs.gantt':               { renderer: 'mermaid',     fallback: 'plantuml',  lang: 'node',   formats: ['svg','png'] },
  
  // AI/大数据
  'ai.neuralnet':           { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png','pdf'] },
  'ai.trainingcurve':       { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png'] },
  'ai.heatmap':             { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png'] },
  'ai.confusion':           { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png'] },
  'ai.pipeline':            { renderer: 'mermaid',     fallback: null,        lang: 'node',   formats: ['svg','png'] },
  
  // 网络
  'network.topology':       { renderer: 'graphviz',    fallback: 'd2',        lang: 'node',   formats: ['png','svg'] },
  'network.protocolstack':  { renderer: 'mermaid',     fallback: null,        lang: 'node',   formats: ['svg','png'] },
  'network.packet':         { renderer: 'mermaid',     fallback: null,        lang: 'node',   formats: ['svg','png'] },
  
  // 芯片
  'chip.architecture':      { renderer: 'd2',          fallback: 'mermaid',   lang: 'node',   formats: ['svg','png'] },
  'chip.timing':            { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png','pdf'] },
  'chip.noc':               { renderer: 'graphviz',    fallback: 'mpl_diagram',lang: 'node',   formats: ['png','svg'] },
  'chip.circuit':           { renderer: 'schemdraw',   fallback: null,        lang: 'python', formats: ['svg','pdf'] },
  
  // 制造业
  'manufacturing.process':  { renderer: 'mermaid',     fallback: 'd2',        lang: 'node',   formats: ['svg','png'] },
  'manufacturing.spc':      { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png'] },
  'manufacturing.supplychain': { renderer: 'graphviz', fallback: 'd2',        lang: 'node',   formats: ['png','svg'] },
  
  // 通用
  'general.mindmap':        { renderer: 'markmap',     fallback: null,        lang: 'node',   formats: ['svg','html'] },
  'general.sankey':         { renderer: 'mpl_diagram', fallback: 'd2',        lang: 'python', formats: ['png','svg'] },
  'general.chart':          { renderer: 'mpl_diagram', fallback: 'vegalite',  lang: 'python', formats: ['png','svg'] },
  'general.table':          { renderer: 'mpl_diagram', fallback: null,        lang: 'python', formats: ['png','pdf'] },
};

// ========================================================================
// Node.js 渲染器加载器
// ========================================================================
const NODE_RENDERERS = {};
function loadNodeRenderer(name) {
  if (NODE_RENDERERS[name]) return NODE_RENDERERS[name];
  try {
    const mod = require(`../renderers/node/${name}`);
    NODE_RENDERERS[name] = mod;
    return mod;
  } catch (e) {
    return null;
  }
}

// ========================================================================
// 核心渲染函数
// ========================================================================
async function render(options) {
  const {
    domain,
    type,
    input = {},
    format = 'png',
    width = null,
    dpi = 200,
    outputPath = null,
    keepTemp = false,
  } = options;

  const key = `${domain}.${type}`;
  const entry = REGISTRY[key];
  if (!entry) {
    throw new TdkError(ErrorCode.UNSUPPORTED_TYPE, `不支持的图表类型: ${key}`);
  }

  if (!entry.formats.includes(format)) {
    throw new TdkError(ErrorCode.UNSUPPORTED_FORMAT, `渲染器 ${key} 不支持格式 ${format}，支持: ${entry.formats.join(', ')}`);
  }

  // 解析主/降级渲染器
  const candidates = [entry.renderer];
  if (entry.fallback) candidates.push(entry.fallback);

  let lastError = null;
  for (const rendererName of candidates) {
    const dep = checkAny([rendererName]);
    if (!dep.available) {
      lastError = new TdkError(ErrorCode.DEPENDENCY_MISSING,
        `渲染器 "${rendererName}" 依赖未安装: ${dep.guide?.message || rendererName}`,
        { renderer: rendererName, installCmd: dep.guide?.cmd }
      );
      continue;
    }

    try {
      const outPath = resolveOutputPath(outputPath, domain, type, format);
      const payload = {
        input,
        format,
        outputPath: outPath,
        width,
        dpi,
        domain,
        type,
      };

      let result;
      const renderer = loadNodeRenderer(rendererName);
      if (renderer && renderer.render) {
        result = await renderer.render(payload);
      } else {
        result = await callPython(rendererName, payload);
      }

      if (!result || !result.success) {
        throw new TdkError(ErrorCode.RENDER_FAILED, result?.error || '渲染失败');
      }

      return {
        success: true,
        path: result.path || outPath,
        format: result.format || format,
        size: result.size || 0,
        renderer: rendererName,
        fallbackUsed: rendererName !== entry.renderer,
      };
    } catch (e) {
      lastError = e;
      if (e.code === ErrorCode.TIMEOUT) throw e; // 超时不再降级
    }
  }

  throw lastError || new TdkError(ErrorCode.RENDER_FAILED, `所有渲染器均失败: ${key}`);
}

// ========================================================================
// 工具函数
// ========================================================================
function listSupported() {
  const map = {};
  for (const [key, entry] of Object.entries(REGISTRY)) {
    const [domain, type] = key.split('.');
    if (!map[domain]) map[domain] = [];
    map[domain].push({ type, formats: entry.formats, renderer: entry.renderer, fallback: entry.fallback });
  }
  return map;
}

function listDomains() {
  return [...new Set(Object.keys(REGISTRY).map(k => k.split('.')[0]))];
}

module.exports = { render, listSupported, listDomains, REGISTRY };
