/**
 * 网络领域接口
 */
const { render } = require('../core/engine');

function toDot(nodes, edges, options = {}) {
  const rankdir = options.direction || 'TB';
  let dot = `digraph G {\n  rankdir=${rankdir};\n  node [shape=box, style="rounded,filled", fillcolor="#E8F0FE", fontname="Helvetica"];\n`;
  for (const n of nodes || []) {
    const shape = n.shape || 'box';
    const color = n.color || '#E8F0FE';
    dot += `  "${n.id}" [label="${n.label || n.id}", shape=${shape}, fillcolor="${color}"];\n`;
  }
  for (const e of edges || []) {
    const style = e.style || 'solid';
    dot += `  "${e.from}" -> "${e.to}" [label="${e.label || ''}", style=${style}];\n`;
  }
  dot += '}\n';
  return dot;
}

class Network {
  /**
   * 网络拓扑图
   * @param {object} data
   * @param {object[]} data.nodes
   * @param {object[]} data.edges
   * @param {object} options
   */
  async topology(data, options = {}) {
    const dot = toDot(data.nodes, data.edges, options);
    return render({
      domain: 'network',
      type: 'topology',
      input: { code: dot },
      format: options.format || 'png',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 协议栈图
   * @param {object} data
   * @param {object} options
   */
  async protocolStack(data, options = {}) {
    const layers = data.layers || [
      { name: 'Application', protocols: ['HTTP', 'FTP', 'SMTP'] },
      { name: 'Transport', protocols: ['TCP', 'UDP'] },
      { name: 'Network', protocols: ['IP', 'ICMP'] },
      { name: 'Data Link', protocols: ['Ethernet', 'WiFi'] },
      { name: 'Physical', protocols: ['光纤', '双绞线'] },
    ];
    let dsl = 'graph TD\n';
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      dsl += `  L${i}["${l.name}<br/><small>${l.protocols.join(', ')}</small>"]\n`;
      if (i > 0) dsl += `  L${i-1} --> L${i}\n`;
    }
    return render({
      domain: 'network',
      type: 'protocolstack',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  /**
   * 数据包结构图
   * @param {object} data
   * @param {object} options
   */
  async packet(data, options = {}) {
    const fields = data.fields || [
      { name: 'Header', bits: 32 },
      { name: 'Payload', bits: 448 },
      { name: 'FCS', bits: 32 },
    ];
    let dsl = 'packet-beta\n';
    for (const f of fields) {
      dsl += `  ${f.bits}-bit: ${f.name}\n`;
    }
    // Mermaid 没有原生 packet 图，用 flowchart 替代
    dsl = 'flowchart LR\n';
    for (let i = 0; i < fields.length; i++) {
      dsl += `  F${i}["${fields[i].name}<br/>${fields[i].bits} bits"]\n`;
      if (i > 0) dsl += `  F${i-1} --> F${i}\n`;
    }
    return render({
      domain: 'network',
      type: 'packet',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new Network();
