#!/usr/bin/env python3
"""
PCB-光模块-GPU 产业链与技术关联深度研究报告生成器
改进版：JSON 中间件方案，不再动态生成 Python 文件

工作流:
1. 生成图表 (matplotlib → PNG)
2. 写 report.json (引用 PNG 路径 + 文字内容)
3. python pdf_assembler.py report.json output.pdf
"""
import os
import sys
import json
import subprocess

tdk_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
output_dir = os.path.join(tdk_dir, 'output', 'report_pcb_optical_gpu')
os.makedirs(output_dir, exist_ok=True)

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
try:
    from matplotlib import font_manager
    simhei_path = 'C:/Windows/Fonts/simhei.ttf'
    if os.path.exists(simhei_path):
        font_manager.fontManager.addfont(simhei_path)
        plt.rcParams['font.family'] = 'SimHei'
except:
    pass

# =============================================================================
# 图表生成函数
# =============================================================================
def draw_pcb_supply_chain():
    fig, ax = plt.subplots(figsize=(12, 4))
    ax.set_xlim(0, 12); ax.set_ylim(0, 4); ax.axis('off')
    ax.set_title('PCB 产业链全景', fontsize=14, fontweight='bold', pad=10)
    boxes = [
        (0.5, 2.5, '铜箔\n玻纤布\n树脂', '#FFE4E1'), (2.5, 2.5, '覆铜板\n(CCL)', '#FFDAB9'),
        (4.5, 2.5, '半固化片\n(Prepreg)', '#FFE4E1'),
        (1.5, 1.0, 'PCB 制造\n(深南电路/沪电)', '#E8F0FE'), (4.5, 1.0, 'HDI/封装基板\n(高端板)', '#D6E4F0'),
        (7.5, 1.0, 'SMT 贴片\n(组装)', '#E8F0FE'),
        (6.0, 2.5, 'GPU/AI芯片\n(英伟达/AMD)', '#FCE8E6'), (8.5, 2.5, '服务器/数据中心', '#E6F4EA'),
        (10.5, 2.5, '通信设备\n(5G基站)', '#E6F4EA'),
    ]
    for x, y, text, color in boxes:
        box = FancyBboxPatch((x-0.7, y-0.4), 1.4, 0.8,
            boxstyle="round,pad=0.02,rounding_size=0.1",
            facecolor=color, edgecolor='#333', linewidth=1.2, zorder=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=7, zorder=3)
    arrows = [(1.5,2.5,1.5,1.8),(3.5,2.5,3.5,1.8),(5.5,2.5,5.5,1.8),(2.5,1.0,3.5,1.0),(5.5,1.0,6.5,1.0),(7.0,1.5,7.0,2.1),(8.5,1.5,8.5,2.1)]
    for x1,y1,x2,y2 in arrows:
        ax.annotate('', xy=(x2,y2), xytext=(x1,y1), arrowprops=dict(arrowstyle='->', color='gray', lw=1))
    ax.text(2.5, 3.6, '上游: 原材料', ha='center', fontsize=9, color='#666', style='italic')
    ax.text(6.0, 0.2, '中游: 制造', ha='center', fontsize=9, color='#666', style='italic')
    ax.text(9.0, 3.6, '下游: 应用', ha='center', fontsize=9, color='#666', style='italic')
    plt.tight_layout()
    path = os.path.join(output_dir, 'fig1_pcb_supply_chain.png')
    fig.savefig(path, dpi=200, bbox_inches='tight'); plt.close(fig)
    return path

def draw_optical_module_chain():
    fig, ax = plt.subplots(figsize=(12, 4))
    ax.set_xlim(0, 12); ax.set_ylim(0, 4); ax.axis('off')
    ax.set_title('光模块产业链全景', fontsize=14, fontweight='bold', pad=10)
    boxes = [
        (1.0, 2.0, '光芯片\n(激光器/探测器)', '#FFE4E1', '光迅/源杰'),
        (3.0, 2.0, '光器件\n(TOSA/ROSA)', '#FFDAB9', 'II-VI/光迅'),
        (5.0, 2.0, '光模块\n(组装测试)', '#E8F0FE', '中际旭创/新易盛'),
        (7.5, 2.0, '交换机/路由器\n(设备商)', '#E6F4EA', '思科/华为'),
        (10.0, 2.0, '数据中心/AI集群', '#FCE8E6', '谷歌/微软/Meta'),
    ]
    for x, y, text, color, label in boxes:
        box = FancyBboxPatch((x-0.8, y-0.5), 1.6, 1.0,
            boxstyle="round,pad=0.02,rounding_size=0.1",
            facecolor=color, edgecolor='#333', linewidth=1.2, zorder=2)
        ax.add_patch(box)
        ax.text(x, y+0.15, text, ha='center', va='center', fontsize=7, zorder=3)
        ax.text(x, y-0.25, label, ha='center', va='center', fontsize=6, color='#666', zorder=3)
    for i in range(len(boxes)-1):
        x1, y1 = boxes[i][0]+0.8, boxes[i][1]
        x2, y2 = boxes[i+1][0]-0.8, boxes[i+1][1]
        ax.annotate('', xy=(x2,y2), xytext=(x1,y1), arrowprops=dict(arrowstyle='->', color='#1967D2', lw=1.5))
    ax.text(5.0, 0.5, '核心成本占比: 光芯片 60% → 光器件 20% → 组装 20%',
            ha='center', fontsize=8, color='#444',
            bbox=dict(boxstyle='round', facecolor='#FFF4E5', edgecolor='#FF9800'))
    plt.tight_layout()
    path = os.path.join(output_dir, 'fig2_optical_module_chain.png')
    fig.savefig(path, dpi=200, bbox_inches='tight'); plt.close(fig)
    return path

def draw_optical_principle():
    fig, ax = plt.subplots(figsize=(12, 4.5))
    ax.set_xlim(0, 12); ax.set_ylim(0, 5); ax.axis('off')
    ax.set_title('光模块光电转换原理', fontsize=14, fontweight='bold', pad=10)
    tx_boxes = [
        (1.0, 3.5, '电信号\n输入', '#E8F0FE'), (2.5, 3.5, '激光驱动\n(TIA/LDD)', '#D6E4F0'),
        (4.0, 3.5, '激光器\n(VCSEL/DFB)', '#FCE8E6'), (5.5, 3.5, '调制器\n(EML)', '#FFDAB9'),
    ]
    for x, y, text, color in tx_boxes:
        box = FancyBboxPatch((x-0.55, y-0.35), 1.1, 0.7,
            boxstyle="round,pad=0.02", facecolor=color, edgecolor='#333', linewidth=1, zorder=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=7, zorder=3)
    ax.plot([6.2, 8.2], [3.5, 3.5], color='#9C27B0', linewidth=4, zorder=1)
    ax.text(7.2, 3.9, '单模光纤', ha='center', fontsize=8, color='#9C27B0')
    ax.text(7.2, 3.1, 'λ = 1310/1550nm', ha='center', fontsize=7, color='#9C27B0')
    rx_boxes = [
        (9.0, 3.5, '光电二极管\n(PIN/APD)', '#E6F4EA'),
        (10.5, 3.5, '跨阻放大器\n(TIA)', '#D6E4F0'),
        (11.8, 3.5, '电信号\n输出', '#E8F0FE'),
    ]
    for x, y, text, color in rx_boxes:
        box = FancyBboxPatch((x-0.55, y-0.35), 1.1, 0.7,
            boxstyle="round,pad=0.02", facecolor=color, edgecolor='#333', linewidth=1, zorder=2)
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=7, zorder=3)
    for i in range(len(tx_boxes)-1):
        ax.annotate('', xy=(tx_boxes[i+1][0]-0.55, 3.5), xytext=(tx_boxes[i][0]+0.55, 3.5),
            arrowprops=dict(arrowstyle='->', color='gray', lw=1))
    ax.annotate('', xy=(9.0-0.55, 3.5), xytext=(8.2, 3.5), arrowprops=dict(arrowstyle='->', color='#9C27B0', lw=1.5))
    for i in range(len(rx_boxes)-1):
        ax.annotate('', xy=(rx_boxes[i+1][0]-0.55, 3.5), xytext=(rx_boxes[i][0]+0.55, 3.5),
            arrowprops=dict(arrowstyle='->', color='gray', lw=1))
    ax.text(6.2, 1.5, r'$P_{out} = P_{in} \cdot 10^{-\alpha L / 10}$', ha='center', fontsize=12,
            bbox=dict(boxstyle='round', facecolor='#FFFDE7', edgecolor='#FBC02D'))
    ax.text(6.2, 0.8, r'$BER = Q\left(\sqrt{\frac{2E_b}{N_0}}\right)$', ha='center', fontsize=12,
            bbox=dict(boxstyle='round', facecolor='#FFFDE7', edgecolor='#FBC02D'))
    ax.text(6.2, 0.2, '光纤衰减公式              误码率公式', ha='center', fontsize=8, color='#666')
    plt.tight_layout()
    path = os.path.join(output_dir, 'fig3_optical_principle.png')
    fig.savefig(path, dpi=200, bbox_inches='tight'); plt.close(fig)
    return path

def draw_gpu_architecture():
    fig, ax = plt.subplots(figsize=(12, 5.5))
    ax.set_xlim(0, 12); ax.set_ylim(0, 6); ax.axis('off')
    ax.set_title('GPU 内部架构示意图 (以 NVIDIA H100 为例)', fontsize=14, fontweight='bold', pad=10)
    outer = FancyBboxPatch((0.3, 0.3), 11.4, 5.2,
        boxstyle="round,pad=0.02,rounding_size=0.2",
        facecolor='#F5F5F5', edgecolor='#1565C0', linewidth=2, zorder=1)
    ax.add_patch(outer)
    ax.text(6.0, 5.7, 'NVIDIA H100 GPU Die', ha='center', fontsize=10, color='#1565C0', fontweight='bold')
    for row in range(3):
        for col in range(5):
            x, y = 1.0 + col * 2.0, 3.8 - row * 1.3
            rect = FancyBboxPatch((x-0.7, y-0.45), 1.4, 0.9,
                boxstyle="round,pad=0.02", facecolor='#E3F2FD', edgecolor='#1976D2', linewidth=0.8, zorder=2)
            ax.add_patch(rect)
            ax.text(x, y, f'SM\n{row*5+col+1}', ha='center', va='center', fontsize=6, zorder=3)
    ax.text(6.0, 3.0, '每个 SM 包含: 128 FP32 CUDA Core + 4 Tensor Core + 256 KB Register',
            ha='center', fontsize=8, color='#1565C0',
            bbox=dict(boxstyle='round', facecolor='#E8F0FE', edgecolor='#1976D2'))
    hbm_rect = FancyBboxPatch((1.0, 0.6), 10.0, 0.8,
        boxstyle="round,pad=0.02", facecolor='#FCE8E6', edgecolor='#C62828', linewidth=1, zorder=2)
    ax.add_patch(hbm_rect)
    ax.text(6.0, 1.0, 'HBM3 显存堆栈  (80GB / 3.35TB/s)', ha='center', va='center', fontsize=9, color='#C62828', zorder=3)
    ax.text(6.0, 0.3, 'NVLink 4.0 (900 GB/s)  ←→  PCIe 5.0 (128 GB/s)',
            ha='center', fontsize=8, color='#2E7D32',
            bbox=dict(boxstyle='round', facecolor='#E6F4EA', edgecolor='#2E7D32'))
    plt.tight_layout()
    path = os.path.join(output_dir, 'fig4_gpu_architecture.png')
    fig.savefig(path, dpi=200, bbox_inches='tight'); plt.close(fig)
    return path

def draw_system_relation():
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.set_xlim(0, 12); ax.set_ylim(0, 7); ax.axis('off')
    ax.set_title('PCB-光模块-GPU 系统关联架构', fontsize=14, fontweight='bold', pad=10)
    gpu = FancyBboxPatch((4.5, 4.5), 3.0, 1.8,
        boxstyle="round,pad=0.02,rounding_size=0.15",
        facecolor='#E3F2FD', edgecolor='#1565C0', linewidth=2, zorder=2)
    ax.add_patch(gpu)
    ax.text(6.0, 5.7, 'GPU 芯片', ha='center', va='center', fontsize=11, fontweight='bold', color='#1565C0')
    ax.text(6.0, 5.2, 'H100 / MI300X / Gaudi', ha='center', va='center', fontsize=8, color='#1565C0')
    ax.text(6.0, 4.8, 'Tensor Core + HBM', ha='center', va='center', fontsize=7, color='#666')
    pcb = FancyBboxPatch((3.0, 2.8), 6.0, 1.2,
        boxstyle="round,pad=0.02", facecolor='#E6F4EA', edgecolor='#2E7D32', linewidth=1.5, zorder=2)
    ax.add_patch(pcb)
    ax.text(6.0, 3.5, '高端封装基板 / HDI 板', ha='center', va='center', fontsize=10, fontweight='bold', color='#2E7D32')
    ax.text(6.0, 3.1, '层数: 20-40层 | 线宽/距: 20/20μm | 材料: Very Low Loss', ha='center', va='center', fontsize=7, color='#2E7D32')
    for x, y, label, vendor in [(1.0, 0.8, '光模块', '中际旭创'), (9.2, 0.8, '光模块', 'Coherent')]:
        om = FancyBboxPatch((x, y), 1.8, 1.2,
            boxstyle="round,pad=0.02", facecolor='#FFF3E0', edgecolor='#E65100', linewidth=1.5, zorder=2)
        ax.add_patch(om)
        ax.text(x+0.9, y+0.9, label, ha='center', va='center', fontsize=9, fontweight='bold', color='#E65100')
        ax.text(x+0.9, y+0.5, '800G/1.6T', ha='center', va='center', fontsize=7, color='#E65100')
        ax.text(x+0.9, y+0.1, vendor, ha='center', va='center', fontsize=6, color='#666')
    sw = FancyBboxPatch((4.5, 0.3), 3.0, 1.2,
        boxstyle="round,pad=0.02", facecolor='#F3E5F5', edgecolor='#7B1FA2', linewidth=1.5, zorder=2)
    ax.add_patch(sw)
    ax.text(6.0, 1.1, '交换机/路由器', ha='center', va='center', fontsize=10, fontweight='bold', color='#7B1FA2')
    ax.text(6.0, 0.6, 'Quantum-X / Spectrum-X', ha='center', va='center', fontsize=7, color='#7B1FA2')
    ax.annotate('', xy=(6.0, 4.0), xytext=(6.0, 4.5), arrowprops=dict(arrowstyle='<->', color='#1565C0', lw=1.5))
    ax.text(6.4, 4.25, 'BGA封装\n焊球互联', fontsize=6, color='#1565C0')
    ax.annotate('', xy=(3.0, 3.4), xytext=(2.0, 2.2), arrowprops=dict(arrowstyle='<->', color='#E65100', lw=1.5, connectionstyle='arc3,rad=0.2'))
    ax.annotate('', xy=(9.0, 3.4), xytext=(10.0, 2.2), arrowprops=dict(arrowstyle='<->', color='#E65100', lw=1.5, connectionstyle='arc3,rad=-0.2'))
    ax.text(2.0, 3.0, '金手指\n电信号', fontsize=6, color='#E65100')
    ax.text(10.5, 3.0, '金手指\n电信号', fontsize=6, color='#E65100')
    ax.annotate('', xy=(2.8, 1.4), xytext=(4.5, 0.9), arrowprops=dict(arrowstyle='<->', color='#7B1FA2', lw=1.5))
    ax.annotate('', xy=(9.2, 1.4), xytext=(7.5, 0.9), arrowprops=dict(arrowstyle='<->', color='#7B1FA2', lw=1.5))
    ax.text(3.5, 0.5, '光信号', fontsize=6, color='#7B1FA2')
    ax.text(8.5, 0.5, '光信号', fontsize=6, color='#7B1FA2')
    ax.text(0.3, 6.3, '关系链:', fontsize=9, fontweight='bold', color='#333')
    ax.text(0.3, 5.9, '① GPU 算力 → 驱动 光模块速率升级 (100G→800G→1.6T)', fontsize=8, color='#333')
    ax.text(0.3, 5.5, '② GPU HBM 容量 → 要求 PCB 层数/密度提升 (10层→40层)', fontsize=8, color='#333')
    ax.text(0.3, 5.1, '③ AI 集群规模 → 光模块数量指数增长 (万卡→十万卡)', fontsize=8, color='#333')
    plt.tight_layout()
    path = os.path.join(output_dir, 'fig5_system_relation.png')
    fig.savefig(path, dpi=200, bbox_inches='tight'); plt.close(fig)
    return path

def draw_rate_evolution():
    fig, ax = plt.subplots(figsize=(10, 4))
    years = ['2016', '2018', '2020', '2022', '2024', '2026E', '2028E']
    rates = [100, 100, 400, 800, 800, 1600, 3200]
    colors_bar = ['#4A90D9', '#4A90D9', '#50C878', '#FF6B6B', '#FF6B6B', '#FFD93D', '#9B59B6']
    bars = ax.bar(years, rates, color=colors_bar, edgecolor='#333', linewidth=0.5)
    ax.set_ylabel('速率 (Gbps)', fontsize=10)
    ax.set_title('光模块速率演进与 GPU 算力需求驱动', fontsize=12, fontweight='bold')
    ax.set_ylim(0, 4000)
    gpu_labels = ['P100', 'V100', 'A100', 'H100', 'B100', 'X100', '下一代']
    for i, (bar, gpu) in enumerate(zip(bars, gpu_labels)):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 100, f'{rates[i]}G', ha='center', va='bottom', fontsize=8, fontweight='bold')
        ax.text(bar.get_x() + bar.get_width()/2., height/2, gpu, ha='center', va='center', fontsize=7, color='white', fontweight='bold')
    ax.text(3.5, 3500, 'AI 训练爆发期', fontsize=9, color='red',
            bbox=dict(boxstyle='round', facecolor='#FFEBEE', edgecolor='red'))
    plt.tight_layout()
    path = os.path.join(output_dir, 'fig6_rate_evolution.png')
    fig.savefig(path, dpi=200, bbox_inches='tight'); plt.close(fig)
    return path

def draw_formula():
    fig, ax = plt.subplots(figsize=(10, 2.5))
    ax.axis('off')
    ax.text(0.5, 0.5, r'$P_{rx} = P_{tx} \cdot 10^{-\frac{\alpha L}{10}} + P_{ASE} \quad\quad BER = Q\left(\sqrt{\frac{2E_b}{N_0}}\right) \quad\quad C = B \cdot \log_2(1+SNR)$',
            fontsize=14, ha='center', va='center', transform=ax.transAxes)
    ax.text(0.5, 0.1, '光纤链路功率预算              误码率                    香农极限',
            fontsize=8, ha='center', va='center', color='#666', transform=ax.transAxes)
    plt.tight_layout()
    path = os.path.join(output_dir, 'fig7_formula.png')
    fig.savefig(path, dpi=200, bbox_inches='tight'); plt.close(fig)
    return path

# =============================================================================
# 主流程
# =============================================================================
print('=== Step 1: 生成图表 ===')
figs = {
    'pcb_chain': draw_pcb_supply_chain(),
    'optical_chain': draw_optical_module_chain(),
    'optical_principle': draw_optical_principle(),
    'gpu_arch': draw_gpu_architecture(),
    'system_relation': draw_system_relation(),
    'rate_evolution': draw_rate_evolution(),
    'formula': draw_formula(),
}
for k, v in figs.items():
    print(f'  {k}: {os.path.basename(v)}')

print('\n=== Step 2: 生成 report.json ===')
report_json_path = os.path.join(output_dir, 'report.json')
report = {
    'title': 'PCB-光模块-GPU 产业链与技术关联深度研究报告',
    'content': [
        { 'type': 'cover', 'title': 'PCB-光模块-GPU 产业链与技术关联深度研究报告',
          'subtitle': '从硅基互联到光电融合的算力基础设施全景分析' },

        { 'type': 'heading', 'text': '执行摘要', 'level': 1 },
        { 'type': 'summary', 'text': 'AI 算力爆发正在重塑底层硬件产业链。GPU 作为算力核心，其性能跃升直接驱动 PCB 向高密度/高层数演进，同时推动光模块从 100G 向 1.6T/3.2T 迭代。三者的技术演进形成深度耦合：GPU HBM 容量增长 → 要求 PCB 信号完整性提升；GPU 集群规模扩大 → 光模块数量指数增长；光模块速率提升 → 驱动 PCB 材料向 Very Low Loss 升级。' },

        { 'type': 'heading', 'text': '第一部分: PCB 产业链', 'level': 1 },
        { 'type': 'heading', 'text': '一、PCB 产业链全景', 'level': 2 },
        { 'type': 'paragraph', 'text': 'PCB（Printed Circuit Board）是电子元器件电气连接的载体。AI 时代的高端 PCB 主要包括：封装基板（IC Substrate）、高多层板（HLC）、HDI 板。GPU 芯片通过 BGA 焊球与封装基板互联，封装基板再与母板（HDI）连接。' },
        { 'type': 'heading', 'text': '二、PCB 产业链关键环节', 'level': 2 },
        { 'type': 'paragraph', 'text': '上游原材料（铜箔、玻纤布、树脂）占 PCB 成本的 30-40%，其中覆铜板（CCL）是最核心材料。中游 PCB 制造环节，深南电路、沪电股份、景旺电子是中国龙头。下游应用中，AI 服务器/数据中心是增长最快的细分市场。' },
        { 'type': 'image', 'path': figs['pcb_chain'], 'layout': 'fullwidth', 'caption': 'PCB 产业链全景图', 'dpi': 200 },

        { 'type': 'heading', 'text': '第二部分: 光模块产业链', 'level': 1 },
        { 'type': 'heading', 'text': '三、光模块产业链全景', 'level': 2 },
        { 'type': 'paragraph', 'text': '光模块是实现电-光-电信号转换的核心器件。产业链上游为光芯片（激光器、探测器），中游为光器件（TOSA/ROSA），下游为光模块组装与设备商。光芯片成本占光模块的 50-70%，是产业链价值最高的环节。' },
        { 'type': 'image', 'path': figs['optical_chain'], 'layout': 'fullwidth', 'caption': '光模块产业链全景图', 'dpi': 200 },

        { 'type': 'heading', 'text': '四、光模块技术原理', 'level': 2 },
        { 'type': 'paragraph', 'text': '发送端通过激光器（VCSEL/DFB/EML）将调制电信号转换为特定波长的光信号；接收端通过光电二极管（PIN/APD）将光信号转换为电流信号，再经跨阻放大器（TIA）转为电压信号。核心性能指标包括：速率（Gbps）、功耗（pJ/bit）、传输距离（km）。' },
        { 'type': 'image', 'path': figs['optical_principle'], 'layout': 'fullwidth', 'caption': '光模块光电转换原理图', 'dpi': 200 },
        { 'type': 'paragraph', 'text': '关键技术路线演进：传统可插拔 → 硅光（SiPh）→ LPO（线性直驱）→ CPO（共封装光学）。CPO 将光引擎与交换芯片共封装，功耗降低 70%，但散热和维护挑战极大。' },

        { 'type': 'heading', 'text': '第三部分: GPU 芯片架构', 'level': 1 },
        { 'type': 'heading', 'text': '五、GPU 内部架构', 'level': 2 },
        { 'type': 'paragraph', 'text': '以 NVIDIA H100 为例，GPU 内部由多个 GPC（Graphics Processing Cluster）组成，每个 GPC 包含多个 SM（Streaming Multiprocessor）。H100 拥有 144 个 SM，每个 SM 配备 128 个 FP32 CUDA Core 和 4 个第四代 Tensor Core。HBM3 显存提供 80GB 容量和 3.35TB/s 带宽。' },
        { 'type': 'image', 'path': figs['gpu_arch'], 'layout': 'standalone', 'caption': 'GPU 内部架构示意图（NVIDIA H100）', 'dpi': 200 },

        { 'type': 'heading', 'text': '第四部分: 三者关系与协同演进', 'level': 1 },
        { 'type': 'heading', 'text': '六、系统关联架构', 'level': 2 },
        { 'type': 'paragraph', 'text': '在 AI 服务器中，GPU 芯片通过 BGA 焊球安装在高端封装基板上，基板通过 PCIe 金手指与主板互联。光模块通过主板上的金手指与 GPU/交换机连接，实现光电信号转换。三者构成完整的算力传输链：GPU 生成电信号 → PCB 传输电信号 → 光模块转换为光信号 → 光纤长距传输。' },
        { 'type': 'image', 'path': figs['system_relation'], 'layout': 'standalone', 'caption': 'PCB-光模块-GPU 系统关联架构图', 'dpi': 200 },

        { 'type': 'heading', 'text': '七、光模块速率演进', 'level': 2 },
        { 'type': 'paragraph', 'text': 'GPU 算力的指数增长是光模块速率迭代的根本驱动力。NVIDIA P100（2016）对应 100G 光模块，V100（2018）对应 100G/200G，A100（2020）对应 200G/400G，H100（2022）对应 400G/800G，B100（2024）对应 800G/1.6T。预计到 2028 年，下一代 GPU 将驱动 3.2T 光模块需求。' },
        { 'type': 'image', 'path': figs['rate_evolution'], 'layout': 'fullwidth', 'caption': '光模块速率演进与 GPU 算力需求驱动', 'dpi': 200 },

        { 'type': 'heading', 'text': '八、核心公式', 'level': 2 },
        { 'type': 'paragraph', 'text': '光通信系统的三大核心公式决定了 PCB、光模块和 GPU 的设计约束。光纤链路功率预算决定了传输距离；误码率公式决定了信号完整性要求；香农极限决定了理论最大信道容量。' },
        { 'type': 'image', 'path': figs['formula'], 'layout': 'inline', 'caption': '光通信核心公式', 'dpi': 200 },

        { 'type': 'heading', 'text': '九、关键结论', 'level': 2 },
        { 'type': 'bullet', 'text': 'GPU 算力每 2 年翻一番，驱动光模块速率同步迭代（100G→1.6T→3.2T）' },
        { 'type': 'bullet', 'text': 'GPU HBM 容量从 16GB→80GB→192GB，要求 PCB 层数从 10 层→40 层→60 层' },
        { 'type': 'bullet', 'text': 'AI 集群从千卡→万卡→十万卡，光模块数量从数百→数万→数十万' },
        { 'type': 'bullet', 'text': 'CPO（共封装光学）将在 2027 年后规模化，重构 PCB-光模块-GPU 的物理边界' },
        { 'type': 'bullet', 'text': '中国企业在光模块（中际旭创）和 PCB（深南电路/沪电）领域具备全球竞争力' },
    ]
}

with open(report_json_path, 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print(f'  JSON: {report_json_path}')

print('\n=== Step 3: 组装 PDF ===')
pdf_output = os.path.join(output_dir, 'PCB_Optical_GPU_Report_v2.pdf')
pdf_py = os.path.join(tdk_dir, 'src/pdf/py/pdf_assembler.py')
python_exe = 'D:/ProgramFiles/Anaconda3/envs/fintech2/python.exe'

cmd = [python_exe, pdf_py, report_json_path, pdf_output]
print(f'  Command: {" ".join(cmd)}')
result = subprocess.run(cmd, capture_output=True, text=True, timeout=120, cwd=tdk_dir, env={**os.environ, 'TDK_DIR': tdk_dir})
print(result.stdout)
if result.returncode != 0:
    print('STDERR:', result.stderr)
    sys.exit(1)

if os.path.exists(pdf_output):
    size = os.path.getsize(pdf_output)
    print(f'\n[OK] PDF report generated: {pdf_output}')
    print(f'     Size: {size/1024:.1f} KB')
else:
    print('[FAIL] PDF not generated')
