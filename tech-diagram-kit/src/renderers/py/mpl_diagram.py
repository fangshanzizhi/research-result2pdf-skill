#!/usr/bin/env python3
"""
通用 matplotlib 渲染器
支持: 函数图像、能带图、场线图、神经网络架构、训练曲线、热图、混淆矩阵、SPC控制图、Sankey图、柱状/饼/折线图
"""
import sys
import json
import os
import io
import base64

# 强制 UTF-8 输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def render(payload):
    import matplotlib
    matplotlib.use('Agg')  # 无头模式
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
    import numpy as np
    from matplotlib.sankey import Sankey

    inp = payload.get('input', {})
    fmt = payload.get('format', 'png')
    out_path = payload.get('outputPath')
    width = payload.get('width')
    dpi = payload.get('dpi', 200)
    domain = payload.get('domain', '')
    chart_type = payload.get('type', '')

    fig, ax = plt.subplots(figsize=(8, 5) if width is None else (width/100, width/160))

    # =====================================================================
    # AI: 训练曲线
    # =====================================================================
    if domain == 'ai' and chart_type == 'trainingcurve':
        epochs_raw = inp.get('epochs', 100)
        # 支持 epochs=90 (int) 或 epochs=[1,2,3,...] (list)
        if isinstance(epochs_raw, int):
            epochs = list(range(1, epochs_raw + 1))
        else:
            epochs = list(epochs_raw)
        train_loss = inp.get('trainLoss', [1.0 / (1 + 0.05 * e) + 0.05 * np.random.rand() for e in epochs])
        val_loss = inp.get('valLoss', [1.0 / (1 + 0.04 * e) + 0.08 * np.random.rand() for e in epochs])
        ax.plot(epochs, train_loss, label='Train Loss', color='#1f77b4', linewidth=1.5)
        ax.plot(epochs, val_loss, label='Val Loss', color='#ff7f0e', linewidth=1.5)
        ax.set_xlabel('Epoch')
        ax.set_ylabel('Loss')
        ax.set_title(inp.get('title', 'Training Curve'))
        ax.legend()
        ax.grid(True, alpha=0.3)

    # =====================================================================
    # AI: 注意力热图 / 混淆矩阵
    # =====================================================================
    elif domain == 'ai' and chart_type in ('heatmap', 'confusion'):
        data = np.array(inp.get('data', [[0.8, 0.1, 0.1], [0.1, 0.85, 0.05], [0.05, 0.1, 0.85]]))
        labels = inp.get('labels', [f'Class {i}' for i in range(data.shape[0])])
        im = ax.imshow(data, cmap='YlOrRd', aspect='auto')
        ax.set_xticks(range(len(labels)))
        ax.set_yticks(range(len(labels)))
        ax.set_xticklabels(labels, rotation=45, ha='right')
        ax.set_yticklabels(labels)
        ax.set_title(inp.get('title', 'Heatmap'))
        for i in range(data.shape[0]):
            for j in range(data.shape[1]):
                ax.text(j, i, f'{data[i,j]:.2f}', ha='center', va='center', color='black', fontsize=8)
        plt.colorbar(im, ax=ax)

    # =====================================================================
    # AI: 神经网络架构 (简化版)
    # =====================================================================
    elif domain == 'ai' and chart_type == 'neuralnet':
        layers = inp.get('layers', [3, 5, 4, 2])
        layer_names = inp.get('layerNames', [f'Layer {i+1}' for i in range(len(layers))])
        ax.set_xlim(0, len(layers) + 1)
        ax.set_ylim(0, max(layers) + 1)
        ax.axis('off')
        ax.set_title(inp.get('title', 'Neural Network Architecture'))
        node_positions = []
        for i, n in enumerate(layers):
            x = i + 1
            positions = []
            for j in range(n):
                y = (max(layers) - n) / 2 + j + 1
                circle = Circle((x, y), 0.25, facecolor='#4A90D9', edgecolor='black', zorder=2)
                ax.add_patch(circle)
                positions.append((x, y))
            node_positions.append(positions)
            ax.text(x, 0.3, layer_names[i], ha='center', fontsize=9)
        # Draw connections
        for i in range(len(node_positions) - 1):
            for p1 in node_positions[i]:
                for p2 in node_positions[i + 1]:
                    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], 'k-', alpha=0.15, linewidth=0.5, zorder=1)

    # =====================================================================
    # 物理: 能带图
    # =====================================================================
    elif domain == 'physics' and chart_type == 'banddiagram':
        x = np.linspace(0, 1, 200)
        Ec = inp.get('conductionBand', 1.0 + 0.5 * np.cos(2 * np.pi * x))
        Ev = inp.get('valenceBand', -0.5 + 0.3 * np.cos(2 * np.pi * x))
        Ef = inp.get('fermiLevel', 0.0)
        ax.plot(x, Ec, label='Conduction Band', color='blue', linewidth=2)
        ax.plot(x, Ev, label='Valence Band', color='red', linewidth=2)
        ax.axhline(Ef, color='green', linestyle='--', label='Fermi Level')
        ax.fill_between(x, Ec, Ev, alpha=0.2, color='gray', label='Band Gap')
        ax.set_xlabel('k-point')
        ax.set_ylabel('Energy (eV)')
        ax.set_title(inp.get('title', 'Energy Band Diagram'))
        ax.legend(loc='upper right')
        ax.grid(True, alpha=0.3)

    # =====================================================================
    # 物理: 场线图
    # =====================================================================
    elif domain == 'physics' and chart_type == 'field':
        X, Y = np.meshgrid(np.linspace(-2, 2, 20), np.linspace(-2, 2, 20))
        U = inp.get('Ux', -Y)
        V = inp.get('Vy', X)
        ax.quiver(X, Y, U, V, color='blue', alpha=0.7)
        ax.set_xlabel('x')
        ax.set_ylabel('y')
        ax.set_title(inp.get('title', 'Vector Field'))
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3)

    # =====================================================================
    # 数学: 几何图
    # =====================================================================
    elif domain == 'math' and chart_type == 'geometry':
        shapes = inp.get('shapes', [])
        ax.set_aspect('equal')
        ax.set_xlim(inp.get('xlim', (-5, 5)))
        ax.set_ylim(inp.get('ylim', (-5, 5)))
        ax.grid(True, alpha=0.3)
        ax.set_title(inp.get('title', 'Geometry'))
        for s in shapes:
            kind = s.get('type', 'polygon')
            if kind == 'polygon':
                pts = s.get('points', [[0,0],[1,0],[0.5,1]])
                poly = plt.Polygon(pts, facecolor=s.get('fill', 'lightblue'), edgecolor=s.get('stroke', 'black'), alpha=0.6)
                ax.add_patch(poly)
            elif kind == 'circle':
                c = Circle((s['x'], s['y']), s['r'], facecolor=s.get('fill', 'none'), edgecolor=s.get('stroke', 'black'))
                ax.add_patch(c)
            elif kind == 'line':
                ax.plot([s['x1'], s['x2']], [s['y1'], s['y2']], color=s.get('stroke', 'black'), linewidth=s.get('width', 1))

    # =====================================================================
    # 数学: 函数图像
    # =====================================================================
    elif domain == 'math' and chart_type == 'function':
        x = np.linspace(inp.get('xmin', -10), inp.get('xmax', 10), 1000)
        funcs = inp.get('functions', [{'expr': 'np.sin(x)', 'label': 'sin(x)', 'color': 'blue'}])
        for f in funcs:
            y = eval(f['expr'], {'np': np, 'x': x, 'pi': np.pi, 'e': np.e})
            ax.plot(x, y, label=f.get('label', ''), color=f.get('color', 'blue'), linewidth=1.5)
        ax.set_xlabel('x')
        ax.set_ylabel('y')
        ax.set_title(inp.get('title', 'Function Plot'))
        ax.legend()
        ax.grid(True, alpha=0.3)

    # =====================================================================
    # 制造业: SPC 控制图
    # =====================================================================
    elif domain == 'manufacturing' and chart_type == 'spc':
        samples = inp.get('samples', list(range(1, 31)))
        values = np.array(inp.get('values', [10 + np.random.randn() for _ in samples]))
        ucl = inp.get('ucl', float(np.mean(values) + 3 * np.std(values)))
        lcl = inp.get('lcl', float(np.mean(values) - 3 * np.std(values)))
        cl = inp.get('cl', float(np.mean(values)))
        ax.plot(samples, values, 'bo-', markersize=4, label='Sample')
        ax.axhline(ucl, color='red', linestyle='--', label=f'UCL = {ucl:.2f}')
        ax.axhline(lcl, color='red', linestyle='--', label=f'LCL = {lcl:.2f}')
        ax.axhline(cl, color='green', linestyle='-', label=f'CL = {cl:.2f}')
        ax.set_xlabel('Sample')
        ax.set_ylabel('Value')
        ax.set_title(inp.get('title', 'SPC Control Chart'))
        ax.legend(loc='best')
        ax.grid(True, alpha=0.3)

    # =====================================================================
    # 通用: Sankey 图
    # =====================================================================
    elif domain == 'general' and chart_type == 'sankey':
        flows = inp.get('flows', [0.25, 0.15, 0.60, -0.20, -0.15, -0.05, -0.50, -0.10])
        labels = inp.get('labels', ['Input A', 'Input B', 'Input C', 'Output D', 'Output E', 'Output F', 'Output G', 'Output H'])
        orientations = inp.get('orientations', [-1, -1, -1, 1, 1, 1, 1, 1])
        sankey = Sankey(ax=ax, unit=inp.get('unit', ''))
        sankey.add(flows=flows, labels=labels, orientations=orientations)
        sankey.finish()
        ax.set_title(inp.get('title', 'Sankey Diagram'))

    # =====================================================================
    # 通用: 数据可视化 (柱状/饼/折线)
    # =====================================================================
    elif domain == 'general' and chart_type == 'chart':
        chart_kind = inp.get('chartType', 'bar')
        labels = inp.get('labels', ['A', 'B', 'C'])
        values = inp.get('values', [10, 20, 15])
        if chart_kind == 'bar':
            ax.bar(labels, values, color=inp.get('colors', ['#4A90D9', '#50C878', '#FF6B6B']))
        elif chart_kind == 'pie':
            ax.pie(values, labels=labels, autopct='%1.1f%%', startangle=90)
        elif chart_kind == 'line':
            ax.plot(labels, values, 'o-', linewidth=2, markersize=6)
        ax.set_title(inp.get('title', 'Chart'))

    # =====================================================================
    # 芯片: 时序图
    # =====================================================================
    elif domain == 'chip' and chart_type == 'timing':
        signals = inp.get('signals', [
            {'name': 'CLK', 'wave': [0,0,1,1,0,0,1,1,0,0]},
            {'name': 'DATA', 'wave': [0,0,0,1,1,1,0,0,0,0]},
        ])
        ax.set_xlim(0, len(signals[0]['wave']) if signals else 10)
        ax.set_ylim(0, len(signals))
        ax.set_yticks([i + 0.5 for i in range(len(signals))])
        ax.set_yticklabels([s['name'] for s in signals])
        ax.set_xlabel('Time')
        ax.set_title(inp.get('title', 'Timing Diagram'))
        for i, sig in enumerate(signals):
            wave = sig['wave']
            for t in range(len(wave) - 1):
                v1, v2 = wave[t], wave[t+1]
                y1 = i + 0.2 if v1 == 0 else i + 0.8
                y2 = i + 0.2 if v2 == 0 else i + 0.8
                ax.plot([t, t+1], [y1, y2], color='black', linewidth=2)
        ax.grid(True, alpha=0.2)

    # =====================================================================
    # 芯片: NoC 拓扑 (简化)
    # =====================================================================
    elif domain == 'chip' and chart_type == 'noc':
        size = inp.get('meshSize', 3)
        ax.set_xlim(-0.5, size - 0.5)
        ax.set_ylim(-0.5, size - 0.5)
        ax.set_aspect('equal')
        ax.set_title(inp.get('title', f'{size}x{size} Mesh NoC'))
        # Draw routers
        for i in range(size):
            for j in range(size):
                rect = FancyBboxPatch((i-0.3, j-0.3), 0.6, 0.6, boxstyle="round,pad=0.02", facecolor='#E8F0FE', edgecolor='#1967D2')
                ax.add_patch(rect)
                ax.text(i, j, f'R{i},{j}', ha='center', va='center', fontsize=7)
        # Draw links
        for i in range(size):
            for j in range(size):
                if i < size - 1:
                    ax.annotate('', xy=(i+1, j), xytext=(i, j), arrowprops=dict(arrowstyle='->', color='gray', lw=0.8))
                if j < size - 1:
                    ax.annotate('', xy=(i, j+1), xytext=(i, j), arrowprops=dict(arrowstyle='->', color='gray', lw=0.8))
        ax.set_xticks([])
        ax.set_yticks([])

    # =====================================================================
    # 默认 fallback: 空画布带提示
    # =====================================================================
    else:
        ax.text(0.5, 0.5, f'Unsupported: {domain}.{chart_type}', transform=ax.transAxes, ha='center', va='center', fontsize=14)
        ax.set_title('Not Implemented')

    plt.tight_layout()

    if fmt == 'pdf':
        fig.savefig(out_path, format='pdf', bbox_inches='tight')
    else:
        fig.savefig(out_path, format='png', dpi=dpi, bbox_inches='tight')
    plt.close(fig)

    size = os.path.getsize(out_path)
    return {'success': True, 'path': out_path, 'format': fmt, 'size': size}


if __name__ == '__main__':
    payload = json.load(sys.stdin)
    result = render(payload)
    print(json.dumps(result, ensure_ascii=False))
