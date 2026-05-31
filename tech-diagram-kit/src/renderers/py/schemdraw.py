#!/usr/bin/env python3
"""
电路图渲染器 (schemdraw)
支持: 基本电路、逻辑门、运算放大器电路
"""
import sys
import json
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def render(payload):
    try:
        import schemdraw
        import schemdraw.elements as elm
    except ImportError:
        return {'success': False, 'error': 'schemdraw 未安装。请执行: pip install schemdraw'}

    inp = payload.get('input', {})
    fmt = payload.get('format', 'svg')
    out_path = payload.get('outputPath')
    circuit_type = inp.get('circuitType', 'basic')

    d = schemdraw.Drawing()

    if circuit_type == 'basic':
        # 基本RC电路
        d += elm.SourceV().label('Vcc')
        d += elm.Resistor().label('R1')
        d += elm.Capacitor().label('C1')
        d += elm.Ground()
    elif circuit_type == 'opamp':
        # 运算放大器反相放大器
        d += elm.Opamp()
        d += elm.Resistor().at(d.elements[-1].in1).to(d.elements[-1].in1 + (-1, 0)).label('Rin')
        d += elm.Resistor().at(d.elements[-1].out).to(d.elements[-1].out + (1, 0)).label('Rout')
    elif circuit_type == 'logic':
        # 逻辑门示例
        d += elm.And().label('AND')
    else:
        # 用户自定义元件列表
        elements = inp.get('elements', [
            {'type': 'SourceV', 'label': 'V'},
            {'type': 'Resistor', 'label': 'R'},
        ])
        for e in elements:
            cls = getattr(elm, e['type'], elm.Dot)
            d += cls().label(e.get('label', ''))

    if fmt == 'pdf':
        d.save(out_path, fmt='pdf')
    elif fmt == 'png':
        d.save(out_path, fmt='png', dpi=200)
    else:
        d.save(out_path, fmt='svg')

    size = os.path.getsize(out_path)
    return {'success': True, 'path': out_path, 'format': fmt, 'size': size}


if __name__ == '__main__':
    payload = json.load(sys.stdin)
    result = render(payload)
    print(json.dumps(result, ensure_ascii=False))
