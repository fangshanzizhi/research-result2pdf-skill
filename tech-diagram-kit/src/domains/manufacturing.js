/**
 * 制造业领域接口
 */
const { render } = require('../core/engine');

class Manufacturing {
  /**
   * 工艺流程图
   * @param {object} data
   * @param {object[]} data.steps - 工艺步骤
   * @param {object} options
   */
  async process(data, options = {}) {
    const steps = data.steps || [
      { id: 'A', name: '原料入库', next: 'B' },
      { id: 'B', name: '加工', next: 'C' },
      { id: 'C', name: '质检', next: 'D' },
      { id: 'D', name: '包装', next: 'E' },
      { id: 'E', name: '出库', next: null },
    ];
    let dsl = 'flowchart LR\n';
    for (const s of steps) {
      dsl += `  ${s.id}["${s.name}"]\n`;
      if (s.next) dsl += `  ${s.id} --> ${s.next}\n`;
    }
    return render({
      domain: 'manufacturing',
      type: 'process',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  /**
   * SPC 统计过程控制图
   * @param {object} data
   * @param {number[]} data.samples - 样本编号
   * @param {number[]} data.values - 样本值
   * @param {object} options
   */
  async spc(data, options = {}) {
    return render({
      domain: 'manufacturing',
      type: 'spc',
      input: {
        samples: data.samples,
        values: data.values,
        ucl: data.ucl,
        lcl: data.lcl,
        cl: data.cl,
        title: options.title || 'SPC Control Chart',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 供应链图
   * @param {object} data
   * @param {object[]} data.nodes
   * @param {object[]} data.edges
   * @param {object} options
   */
  async supplyChain(data, options = {}) {
    const dot = `digraph G {
  rankdir=LR;
  node [shape=box, style="rounded,filled", fillcolor="#E8F0FE"];
${(data.nodes || []).map(n => `  "${n.id}" [label="${n.label || n.id}"];`).join('\n')}
${(data.edges || []).map(e => `  "${e.from}" -> "${e.to}" [label="${e.label || ''}"];`).join('\n')}
}`;
    return render({
      domain: 'manufacturing',
      type: 'supplychain',
      input: { code: dot },
      format: options.format || 'png',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new Manufacturing();
