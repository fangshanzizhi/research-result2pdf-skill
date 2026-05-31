#!/usr/bin/env python3
"""
TikZ 渲染器
输入: TikZ 代码字符串
输出: PDF (需要 pdflatex)
"""
import sys
import json
import os
import io
import subprocess
import tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def render(payload):
    inp = payload.get('input', {})
    tikz_code = inp.get('code', '') or inp.get('tikz', '')
    if not tikz_code:
        return {'success': False, 'error': 'TikZ 代码不能为空'}

    fmt = payload.get('format', 'pdf')
    out_path = payload.get('outputPath')

    # 检查 pdflatex
    try:
        subprocess.run(['pdflatex', '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except FileNotFoundError:
        return {'success': False, 'error': 'pdflatex 未安装。请安装 TeX Live 或 MiKTeX'}

    # 构建完整 LaTeX 文档
    tex_doc = r"""\documentclass[tikz,border=10pt]{standalone}
\usepackage{tikz}
\usepackage{amsmath,amssymb}
\usepackage[UTF8]{ctex}  % 中文支持
\usetikzlibrary{arrows.meta,positioning,calc,shapes.geometric,fit,backgrounds}
\begin{document}
""" + tikz_code + r"""
\end{document}
"""

    # 使用临时目录编译
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, 'diagram.tex')
        with open(tex_path, 'w', encoding='utf-8') as f:
            f.write(tex_doc)

        try:
            subprocess.run(
                ['pdflatex', '-interaction=nonstopmode', '-output-directory', tmpdir, tex_path],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=True
            )
        except subprocess.CalledProcessError as e:
            return {'success': False, 'error': f'pdflatex 编译失败: {e.stderr.decode("utf-8", errors="replace")[:500]}'}

        pdf_path = os.path.join(tmpdir, 'diagram.pdf')

        if fmt == 'pdf':
            import shutil
            shutil.copy(pdf_path, out_path)
        elif fmt == 'png':
            # 用 pymupdf 或 wand 转 PNG
            try:
                import fitz  # pymupdf
                doc = fitz.open(pdf_path)
                page = doc[0]
                pix = page.get_pixmap(dpi=200)
                pix.save(out_path)
                doc.close()
            except ImportError:
                return {'success': False, 'error': '需要 pymupdf 将 PDF 转为 PNG: pip install pymupdf'}
        else:
            return {'success': False, 'error': f'TikZ 渲染器不支持格式: {fmt}'}

    size = os.path.getsize(out_path)
    return {'success': True, 'path': out_path, 'format': fmt, 'size': size}


if __name__ == '__main__':
    payload = json.load(sys.stdin)
    result = render(payload)
    print(json.dumps(result, ensure_ascii=False))
