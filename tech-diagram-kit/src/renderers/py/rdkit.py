#!/usr/bin/env python3
"""
化学分子渲染器 (RDKit)
输入: SMILES 字符串
输出: 2D 分子结构图
"""
import sys
import json
import os
import io

# 修复: 脚本名 rdkit.py 与安装的 rdkit 包冲突
# 移除脚本所在目录和当前工作目录，避免导入自身
try:
    _script_dir = os.path.dirname(os.path.abspath(__file__))
    if _script_dir in sys.path:
        sys.path.remove(_script_dir)
except NameError:
    pass
if '' in sys.path:
    sys.path.remove('')
_cwd = os.getcwd()
if _cwd in sys.path:
    sys.path.remove(_cwd)

# 只在交互模式下重新包装 stdout，避免 pipe 调用时 sys.stdout.buffer 为 None 导致崩溃
if hasattr(sys.stdout, 'buffer') and sys.stdout.buffer:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# RDKit C++ 扩展在 Windows 子进程中可能尝试写 stderr 导致崩溃
# 确保 stderr 始终有效
try:
    sys.stderr.write('')
except (AttributeError, ValueError, OSError):
    sys.stderr = open(os.devnull, 'w')

def render(payload):
    try:
        from rdkit import Chem
        from rdkit.Chem import Draw, AllChem
    except ImportError:
        return {'success': False, 'error': 'RDKit 未安装。请执行: conda install -c conda-forge rdkit'}

    inp = payload.get('input', {})
    smiles = inp.get('smiles', '')
    if not smiles:
        return {'success': False, 'error': 'SMILES 字符串不能为空'}

    fmt = payload.get('format', 'png')
    out_path = payload.get('outputPath')
    width = payload.get('width', 400) or 400
    height = payload.get('height', 400) or 400
    style = inp.get('style', '2d')  # '2d' | 'ball-and-stick' (3d 暂不支持)

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {'success': False, 'error': f'无效的 SMILES: {smiles}'}

    AllChem.Compute2DCoords(mol)

    if fmt == 'svg':
        drawer = Draw.rdMolDraw2D.MolDraw2DSVG(width, height)
        opts = drawer.drawOptions()
        opts.clearBackground = False
        drawer.DrawMolecule(mol)
        drawer.FinishDrawing()
        svg = drawer.GetDrawingText()
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(svg)
    else:
        img = Draw.MolToImage(mol, size=(width, height), kekulize=True)
        img.save(out_path)

    size = os.path.getsize(out_path)
    return {'success': True, 'path': out_path, 'format': fmt, 'size': size}


if __name__ == '__main__':
    payload = json.load(sys.stdin)
    result = render(payload)
    output = json.dumps(result, ensure_ascii=False) + '\n'
    # 避免 RDKit C++ 扩展关闭 stdout 导致 print 崩溃，直接使用 os.write
    os.write(1, output.encode('utf-8'))
