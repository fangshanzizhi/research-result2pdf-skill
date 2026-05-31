/**
 * 通用图表接口
 */
const { render } = require('../core/engine');

class General {
  /**
   * 思维导图
   * @param {string} markdown - Markdown 大纲文本
   * @param {object} options
   */
  async mindmap(markdown, options = {}) {
    return render({
      domain: 'general',
      type: 'mindmap',
      input: { code: markdown },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  /**
   * Sankey 桑基图
   * @param {object} data
   * @param {number[]} data.flows - 流量数组
   * @param {string[]} data.labels - 标签数组
   * @param {object} options
   */
  async sankey(data, options = {}) {
    return render({
      domain: 'general',
      type: 'sankey',
      input: {
        flows: data.flows,
        labels: data.labels,
        orientations: data.orientations,
        unit: data.unit || '',
        title: options.title || 'Sankey Diagram',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 数据可视化图表
   * @param {object} data
   * @param {string} data.chartType - 'bar' | 'pie' | 'line'
   * @param {string[]} data.labels
   * @param {number[]} data.values
   * @param {object} options
   */
  async chart(data, options = {}) {
    return render({
      domain: 'general',
      type: 'chart',
      input: {
        chartType: data.chartType || 'bar',
        labels: data.labels,
        values: data.values,
        colors: data.colors,
        title: options.title || 'Chart',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new General();
