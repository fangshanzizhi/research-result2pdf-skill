#!/usr/bin/env python3
"""
LaTeX 公式渲染器 (matplotlib.mathtext)
不依赖完整 LaTeX 环境，用 matplotlib 内置 mathtext 引擎
"""
import sys
import json
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def render(payload):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    inp = payload.get('input', {})
    if isinstance(inp, str):
        inp = {'latex': inp}
    latex = inp.get('latex', '') or inp.get('code', '') or inp.get('formula', '')
    if not latex:
        return {'success': False, 'error': 'LaTeX 公式不能为空'}

    fmt = payload.get('format', 'png')
    out_path = payload.get('outputPath')
    dpi = payload.get('dpi', 200)
    font_size = inp.get('fontSize', 18)
    color = inp.get('color', 'black')

    fig, ax = plt.subplots(figsize=(8, 2))
    ax.axis('off')

    # 中文字体支持
    font = {'family': 'sans-serif'}
    plt.rc('font', **font)

    # matplotlib mathtext 需要 $...$ 包裹，但如果用户已提供则不再重复
    text = latex.strip()
    if not text.startswith('$'):
        text = '$' + text
    if not text.endswith('$'):
        text = text + '$'

    ax.text(0.5, 0.5, text, fontsize=font_size, ha='center', va='center',
            color=color, transform=ax.transAxes)

    if fmt == 'svg':
        fig.savefig(out_path, format='svg', bbox_inches='tight', transparent=True)
    else:
        fig.savefig(out_path, format='png', dpi=dpi, bbox_inches='tight', transparent=True)
    plt.close(fig)

    size = os.path.getsize(out_path)
    return {'success': True, 'path': out_path, 'format': fmt, 'size': size}


if __name__ == '__main__':
    payload = json.load(sys.stdin)
    result = render(payload)
    print(json.dumps(result, ensure_ascii=False))
