/**
 * AI / 机器学习领域接口
 */
const { render } = require('../core/engine');

class AI {
  /**
   * 神经网络架构图
   * @param {number[]} layers - 每层神经元数量，如 [3,5,4,2]
   * @param {object} options
   */
  async neuralNet(layers, options = {}) {
    return render({
      domain: 'ai',
      type: 'neuralnet',
      input: {
        layers: layers || [3, 5, 4, 2],
        layerNames: options.layerNames,
        title: options.title || 'Neural Network Architecture',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 训练曲线
   * @param {object} data
   * @param {number[]} data.epochs
   * @param {number[]} data.trainLoss
   * @param {number[]} data.valLoss
   * @param {object} options
   */
  async trainingCurve(data, options = {}) {
    return render({
      domain: 'ai',
      type: 'trainingcurve',
      input: {
        epochs: data.epochs,
        trainLoss: data.trainLoss,
        valLoss: data.valLoss,
        title: options.title || 'Training Curve',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 注意力热图 / 混淆矩阵
   * @param {number[][]} matrix
   * @param {string[]} labels
   * @param {object} options
   */
  async heatmap(matrix, labels, options = {}) {
    return render({
      domain: 'ai',
      type: 'heatmap',
      input: {
        data: matrix,
        labels: labels,
        title: options.title || 'Heatmap',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  async confusionMatrix(matrix, labels, options = {}) {
    return render({
      domain: 'ai',
      type: 'confusion',
      input: {
        data: matrix,
        labels: labels,
        title: options.title || 'Confusion Matrix',
      },
      format: options.format || 'png',
      outputPath: options.outputPath,
      dpi: options.dpi || 200,
    });
  }

  /**
   * ML Pipeline 流程图
   * @param {object} data - Mermaid 风格 pipeline 描述
   * @param {object} options
   */
  async pipeline(data, options = {}) {
    const dsl = data.dsl || data.code || `flowchart LR\n  RawData --> Preprocess --> Model --> Evaluate`;
    return render({
      domain: 'ai',
      type: 'pipeline',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new AI();
