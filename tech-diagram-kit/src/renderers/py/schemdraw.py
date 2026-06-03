#!/usr/bin/env python3
"""
电路图渲染器 (schemdraw)
支持: 基本电路、逻辑门、运算放大器电路
"""
import sys
import json
import os
import io

# 修复: 脚本名 schemdraw.py 与安装的 schemdraw 包冲突
# 移除脚本所在目录和当前工作目录，避免导入自身
try:
    _script_dir = os.path.dirname(os.path.abspath(__file__))
    if _script_dir in sys.path:
        sys.path.remove(_script_dir)
except NameError:
    pass  # __file__ 在 REPL / -c 模式下不可用
if '' in sys.path:
    sys.path.remove('')
_cwd = os.getcwd()
if _cwd in sys.path:
    sys.path.remove(_cwd)

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def render(payload):
    try:
        # 设置非交互式 backend，避免 Windows pipe 调用时 GUI 初始化失败
        import matplotlib
        matplotlib.use('Agg')
        import schemdraw
        import schemdraw.elements as elm
    except ImportError as e:
        return {'success': False, 'error': f'schemdraw 未安装或依赖缺失: {e}'}

    inp = payload.get('input', {})
    # 支持字符串简写输入（默认使用 basic 电路）
    if isinstance(inp, str):
        inp = {'circuitType': 'basic'}
    fmt = payload.get('format', 'svg')
    out_path = payload.get('outputPath')
    if not out_path:
        return {'success': False, 'error': '缺少 outputPath'}
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
    elif circuit_type == 'custom':
        # 用户自定义元件列表
        elements = inp.get('elements')
        if not elements:
            return {'success': False, 'error': 'custom 类型需要提供 elements'}
        for e in elements:
            cls = getattr(elm, e['type'], None)
            if cls is None:
                return {'success': False, 'error': f"未知元件类型: {e['type']}"}
            d += cls().label(e.get('label', ''))
    else:
        return {'success': False, 'error': f"未知电路类型: {circuit_type}"}

    # schemdraw 0.23+ 通过文件扩展名自动识别格式
    if fmt == 'png':
        d.save(out_path, dpi=200)
    else:
        d.save(out_path)

    if not os.path.exists(out_path):
        return {'success': False, 'error': f'保存失败: {out_path}'}
    size = os.path.getsize(out_path)
    return {'success': True, 'path': out_path, 'format': fmt, 'size': size}


if __name__ == '__main__':
    payload = json.load(sys.stdin)
    result = render(payload)
    print(json.dumps(result, ensure_ascii=False))
