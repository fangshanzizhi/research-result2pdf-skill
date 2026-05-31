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

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

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
    width = payload.get('width', 400)
    height = payload.get('height', 400)
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
    print(json.dumps(result, ensure_ascii=False))
