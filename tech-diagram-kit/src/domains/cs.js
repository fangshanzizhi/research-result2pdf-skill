/**
 * 计算机/软件工程领域接口
 */
const { render } = require('../core/engine');

function toMermaidDSL(kind, data) {
  // 根据类型和数据生成 Mermaid DSL
  if (kind === 'uml-class') {
    let dsl = 'classDiagram\n';
    for (const cls of data.classes || []) {
      dsl += `  class ${cls.name}{\n`;
      for (const a of cls.attrs || []) dsl += `    ${a}\n`;
      for (const m of cls.methods || []) dsl += `    ${m}()\n`;
      dsl += '  }\n';
    }
    for (const r of data.relations || []) {
      dsl += `  ${r.from} "${r.fromLabel || ''}" --|> "${r.toLabel || ''}" ${r.to} : ${r.label || ''}\n`;
    }
    return dsl;
  }
  if (kind === 'uml-sequence') {
    let dsl = 'sequenceDiagram\n';
    for (const p of data.participants || []) dsl += `  participant ${p}\n`;
    for (const m of data.messages || []) {
      dsl += `  ${m.from}->>${m.to}: ${m.text}\n`;
    }
    return dsl;
  }
  if (kind === 'architecture') {
    return data.dsl || data.code || '';
  }
  if (kind === 'er') {
    let dsl = 'erDiagram\n';
    for (const e of data.entities || []) {
      dsl += `  ${e.name} {\n`;
      for (const f of e.fields || []) dsl += `    ${f.type} ${f.name}\n`;
      dsl += '  }\n';
    }
    for (const r of data.relations || []) {
      dsl += `  ${r.from} ||--o{ ${r.to} : "${r.label}"\n`;
    }
    return dsl;
  }
  if (kind === 'statemachine') {
    let dsl = 'stateDiagram-v2\n';
    for (const t of data.transitions || []) {
      dsl += `  ${t.from} --> ${t.to}: ${t.label || ''}\n`;
    }
    return dsl;
  }
  if (kind === 'flowchart') {
    return data.dsl || data.code || `flowchart TD\n  A[Start] --> B[End]`;
  }
  if (kind === 'gantt') {
    let dsl = 'gantt\n  title ' + (data.title || 'Project Schedule') + '\n';
    for (const t of data.tasks || []) {
      dsl += `  ${t.name} :${t.status || 'active'}, ${t.id}, ${t.start}, ${t.end}\n`;
    }
    return dsl;
  }
  return data.dsl || data.code || '';
}

class CS {
  async uml(data, options = {}) {
    const kind = options.kind || 'class';
    const dsl = toMermaidDSL(`uml-${kind}`, data);
    return render({
      domain: 'cs',
      type: 'uml',
      input: { code: dsl },
      format: options.format || 'png',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  async architecture(data, options = {}) {
    const dsl = toMermaidDSL('architecture', data);
    return render({
      domain: 'cs',
      type: 'architecture',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  async er(data, options = {}) {
    const dsl = toMermaidDSL('er', data);
    return render({
      domain: 'cs',
      type: 'er',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  async stateMachine(data, options = {}) {
    const dsl = toMermaidDSL('statemachine', data);
    return render({
      domain: 'cs',
      type: 'statemachine',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  async flowchart(data, options = {}) {
    const dsl = toMermaidDSL('flowchart', data);
    return render({
      domain: 'cs',
      type: 'flowchart',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }

  async gantt(data, options = {}) {
    const dsl = toMermaidDSL('gantt', data);
    return render({
      domain: 'cs',
      type: 'gantt',
      input: { code: dsl },
      format: options.format || 'svg',
      outputPath: options.outputPath,
      width: options.width,
      dpi: options.dpi || 200,
    });
  }
}

module.exports = new CS();
