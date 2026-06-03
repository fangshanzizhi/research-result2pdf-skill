/**
 * Tech Diagram Kit - 统一入口
 * 跨领域技术图表渲染工具包
 *
 * Usage:
 *   const tdk = require('tech-diagram-kit');
 *   await tdk.chemistry.molecule('CCO');
 *   await tdk.physics.formula('E = mc^2');
 *   await tdk.cs.flowchart({ dsl: 'flowchart TD; A-->B;' });
 */

const { render, listSupported, listDomains, REGISTRY } = require('./core/engine');
const { check, checkAll } = require('./core/dependency-check');
const { cleanupTemp } = require('./utils/paths');
const { isSandboxReady } = require('./core/sandbox');
const { setupSandbox, installDependency, buildDependencyList } = require('./core/sandbox-installer');

// 领域接口
const chemistry = require('./domains/chemistry');
const physics = require('./domains/physics');
const math = require('./domains/math');
const cs = require('./domains/cs');
const ai = require('./domains/ai');
const network = require('./domains/network');
const chip = require('./domains/chip');
const manufacturing = require('./domains/manufacturing');
const general = require('./domains/general');

// 底层渲染器（直接访问）
const renderers = {
  mermaid: require('./renderers/node/mermaid'),
  d2: require('./renderers/node/d2'),
  graphviz: require('./renderers/node/graphviz'),
  plantuml: require('./renderers/node/plantuml'),
  mathjax: require('./renderers/node/mathjax'),
  markmap: require('./renderers/node/markmap'),
  vegalite: require('./renderers/node/vegalite'),
};

module.exports = {
  // 核心 API
  render,
  listSupported,
  listDomains,
  checkDependency: check,
  checkAllDependencies: checkAll,
  cleanupTemp,

  // 领域接口
  chemistry,
  physics,
  math,
  cs,
  ai,
  network,
  chip,
  manufacturing,
  general,

  // 底层渲染器（高级用法）
  renderers,

  // 注册表（扩展用）
  REGISTRY,

  // 沙盒依赖管理（新增）
  requireDependencyList: buildDependencyList,
  setupSandbox,
  installDependency,
  isSandboxReady,
};
