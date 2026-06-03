/**
 * PDF 图表布局策略
 * 解决 DPI 换算、尺寸策略、智能分页问题
 */
const { cm } = require('reportlab/lib/units');
const { A4 } = require('reportlab/lib/pagesizes');

// A4 页面常量 (points)
const PAGE_W = A4[0];        // 595.27 pt
const PAGE_H = A4[1];        // 841.89 pt
const MARGIN_X = 2 * cm;     // 左右边距
const MARGIN_Y = 2.5 * cm;   // 上下边距
const HEADER_H = 1.5 * cm;   // 页眉占用
const FOOTER_H = 1.0 * cm;   // 页脚占用

// 可用内容区域
const CONTENT_W = PAGE_W - 2 * MARGIN_X;   // ≈ 453 pt ≈ 16 cm
const CONTENT_H = PAGE_H - MARGIN_Y - FOOTER_H - HEADER_H; // ≈ 680 pt

// 布局模式配置
const LAYOUTS = {
  inline:      { maxW: CONTENT_W * 0.55, maxH: CONTENT_H * 0.18, align: 'CENTER', caption: true },
  fullwidth:   { maxW: CONTENT_W,        maxH: CONTENT_H * 0.50, align: 'CENTER', caption: true },
  halfwidth:   { maxW: CONTENT_W * 0.48, maxH: CONTENT_H * 0.35, align: 'CENTER', caption: true },
  standalone:  { maxW: CONTENT_W * 0.95, maxH: CONTENT_H * 0.85, align: 'CENTER', caption: true, forcePageBreak: true },
};

/**
 * 根据 PNG/SVG 文件计算 PDF 嵌入尺寸
 * @param {string} filePath - 图片路径
 * @param {string} layoutMode - 'inline' | 'fullwidth' | 'halfwidth' | 'standalone'
 * @param {number} sourceDpi - 图片生成时的 DPI (默认 200)
 * @returns {object} { width_pt, height_pt, needsPageBreak, scaleRatio }
 */
function calculateEmbedSize(filePath, layoutMode = 'fullwidth', sourceDpi = 200) {
  const fs = require('fs');
  const config = LAYOUTS[layoutMode] || LAYOUTS.fullwidth;

  // 读取图片原始像素尺寸
  let imgW_px = 0, imgH_px = 0;
  if (filePath.endsWith('.svg')) {
    // SVG: 假设 viewBox 或默认 800x600，按 96 DPI 换算
    const svg = fs.readFileSync(filePath, 'utf-8');
    const vbMatch = svg.match(/viewBox="[\d\s.]+\s+([\d.]+)\s+([\d.]+)"/);
    const wMatch = svg.match(/width="([\d.]+)(px)?"/);
    const hMatch = svg.match(/height="([\d.]+)(px)?"/);
    imgW_px = vbMatch ? parseFloat(vbMatch[1]) : (wMatch ? parseFloat(wMatch[1]) : 800);
    imgH_px = vbMatch ? parseFloat(vbMatch[2]) : (hMatch ? parseFloat(hMatch[1]) : 600);
    sourceDpi = 96; // SVG 标准 DPI
  } else {
    // PNG/JPG: 用 PIL 读取尺寸
    try {
      const { createCanvas, loadImage } = require('canvas');
      // 简单方法：用文件头读取 PNG 尺寸
      const buf = fs.readFileSync(filePath);
      if (buf[0] === 0x89 && buf[1] === 0x50) {
        // PNG: 宽度在字节 16-19，高度在 20-23 (big-endian)
        imgW_px = buf.readUInt32BE(16);
        imgH_px = buf.readUInt32BE(20);
      } else {
        imgW_px = 800; imgH_px = 600;
      }
    } catch {
      imgW_px = 800; imgH_px = 600;
    }
  }

  // 像素 → points (1 inch = 72 pt)
  let pdfW = imgW_px * (72 / sourceDpi);
  let pdfH = imgH_px * (72 / sourceDpi);

  // 按布局模式缩放
  const scaleW = config.maxW / pdfW;
  const scaleH = config.maxH / pdfH;
  const scale = Math.min(scaleW, scaleH, 1.0); // 不放大，只缩小

  pdfW *= scale;
  pdfH *= scale;

  // 判断是否超出页面安全高度
  const needsPageBreak = pdfH > CONTENT_H * 0.45;

  return {
    width: pdfW,
    height: pdfH,
    scaleRatio: scale,
    needsPageBreak: needsPageBreak || config.forcePageBreak,
    layout: layoutMode,
    original: { w: imgW_px, h: imgH_px, dpi: sourceDpi },
  };
}

/**
 * 根据图表类型推荐布局模式
 * @param {string} domain
 * @param {string} type
 * @returns {string} 推荐的 layout 模式
 */
function suggestLayout(domain, type) {
  const key = `${domain}.${type}`;
  const map = {
    // 公式类 → 紧凑行内
    'math.formula': 'inline',
    'physics.formula': 'inline',
    'chemistry.equation': 'inline',

    // 架构/拓扑类 → 全宽大图
    'cs.architecture': 'fullwidth',
    'cs.uml': 'fullwidth',
    'cs.flowchart': 'fullwidth',
    'network.topology': 'fullwidth',
    'chip.architecture': 'fullwidth',
    'chip.noc': 'fullwidth',
    'ai.pipeline': 'fullwidth',

    // 复杂大图 → 独占一页
    'ai.neuralnet': 'standalone',
    'network.protocolstack': 'standalone',
    'general.mindmap': 'standalone',

    // 数据图表 → 半栏或全宽
    'ai.trainingcurve': 'fullwidth',
    'ai.heatmap': 'halfwidth',
    'ai.confusion': 'halfwidth',
    'general.chart': 'halfwidth',
    'manufacturing.spc': 'fullwidth',
    'general.sankey': 'standalone',

    // 工艺/流程 → 全宽
    'manufacturing.process': 'fullwidth',
    'cs.gantt': 'fullwidth',
    'cs.statemachine': 'fullwidth',

    // 分子/电路 → 半栏
    'chemistry.molecule': 'halfwidth',
    'chip.circuit': 'halfwidth',
    'physics.circuit': 'halfwidth',
    'chip.timing': 'fullwidth',

    // 物理/数学大图
    'physics.banddiagram': 'fullwidth',
    'physics.field': 'fullwidth',
    'math.geometry': 'halfwidth',
    'math.function': 'fullwidth',
  };
  return map[key] || 'fullwidth';
}

module.exports = {
  PAGE_W, PAGE_H, CONTENT_W, CONTENT_H, MARGIN_X, MARGIN_Y,
  LAYOUTS,
  calculateEmbedSize,
  suggestLayout,
};
