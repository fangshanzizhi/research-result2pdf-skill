#!/usr/bin/env python3
"""
PDF 组装器 - Python ReportLab + TDK 图表集成
解决文字-图比例问题的核心模块

特性:
1. 通过 subprocess 调用 Node.js TDK CLI 渲染图表
2. DPI 精确换算 (200 DPI → PDF points)
3. 四种布局模式: inline, fullwidth, halfwidth, standalone
4. 智能分页: 大图自动独占一页
"""
import sys
import json
import os
import subprocess
import struct
import tempfile
from pathlib import Path

# ReportLab imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, Frame, PageTemplate
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ============================================================================
# 注册中文字体
# ============================================================================
FONT_PATH = os.environ.get('TDK_FONT_PATH', 'C:/Windows/Fonts/simhei.ttf')
if os.path.exists(FONT_PATH):
    pdfmetrics.registerFont(TTFont('SimHei', FONT_PATH))
    try:
        from reportlab.pdfbase.pdfmetrics import registerFontFamily
        registerFontFamily('SimHei', normal='SimHei', bold='SimHei', italic='SimHei', boldItalic='SimHei')
    except:
        pass
    CN_FONT = 'SimHei'
else:
    CN_FONT = 'Helvetica'

# ============================================================================
# 颜色定义
# ============================================================================
C_DARK = colors.Color(0.13, 0.13, 0.13)
C_MID = colors.Color(0.26, 0.26, 0.26)
C_LIGHT = colors.Color(0.40, 0.40, 0.40)
C_ACCENT = colors.Color(0.20, 0.40, 0.80)
C_BORDER = colors.Color(0.75, 0.75, 0.75)

# ============================================================================
# 页面常量
# ============================================================================
PAGE_W, PAGE_H = A4
MARGIN_X = 2 * cm
MARGIN_Y = 2 * cm
CONTENT_W = PAGE_W - 2 * MARGIN_X
CONTENT_H = PAGE_H - 2 * MARGIN_Y

# ============================================================================
# 布局模式配置
# ============================================================================
LAYOUTS = {
    'inline':      {'maxW': CONTENT_W * 0.55, 'maxH': CONTENT_H * 0.18, 'minH': 30},
    'fullwidth':   {'maxW': CONTENT_W,        'maxH': CONTENT_H * 0.50, 'minH': 80},
    'halfwidth':   {'maxW': CONTENT_W * 0.48, 'maxH': CONTENT_H * 0.35, 'minH': 60},
    'standalone':  {'maxW': CONTENT_W * 0.95, 'maxH': CONTENT_H * 0.85, 'minH': 200},
}

# ============================================================================
# DPI 精确换算: PNG 像素 → PDF points
# ============================================================================
def get_png_size(path):
    """读取 PNG 文件头获取像素尺寸"""
    with open(path, 'rb') as f:
        header = f.read(24)
    if header[:8] != b'\x89PNG\r\n\x1a\n':
        return (800, 600)
    w = struct.unpack('>I', header[16:20])[0]
    h = struct.unpack('>I', header[20:24])[0]
    return (w, h)

def get_svg_size(path):
    """读取 SVG viewBox/width/height"""
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()[:2000]
    import re
    vb = re.search(r'viewBox="[\d\s.]+\s+([\d.]+)\s+([\d.]+)"', text)
    if vb:
        return (float(vb.group(1)), float(vb.group(2)))
    wm = re.search(r'width="([\d.]+)(px)?"', text)
    hm = re.search(r'height="([\d.]+)(px)?"', text)
    w = float(wm.group(1)) if wm else 800
    h = float(hm.group(1)) if hm else 600
    return (w, h)

def calculate_embed_size(file_path, layout_mode='fullwidth', source_dpi=200):
    """
    计算图片在 PDF 中的嵌入尺寸
    返回: (width_pt, height_pt, needs_page_break, scale_ratio)
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.svg':
        img_w, img_h = get_svg_size(file_path)
        source_dpi = 96
    else:
        img_w, img_h = get_png_size(file_path)

    config = LAYOUTS.get(layout_mode, LAYOUTS['fullwidth'])

    pdf_w = img_w * (72.0 / source_dpi)
    pdf_h = img_h * (72.0 / source_dpi)

    scale_w = config['maxW'] / pdf_w if pdf_w > 0 else 1
    scale_h = config['maxH'] / pdf_h if pdf_h > 0 else 1
    scale = min(scale_w, scale_h, 1.0)

    pdf_w *= scale
    pdf_h *= scale

    if pdf_h < config.get('minH', 30):
        scale2 = config['minH'] / pdf_h if pdf_h > 0 else 1
        if scale2 * pdf_w <= config['maxW']:
            pdf_w *= scale2
            pdf_h *= scale2

    needs_break = (pdf_h > CONTENT_H * 0.45) or (layout_mode == 'standalone')
    return (pdf_w, pdf_h, needs_break, scale)

# ============================================================================
# TDK 渲染调用 (Node.js CLI)
# ============================================================================
def find_node():
    for cmd in ['node', 'node.exe']:
        try:
            subprocess.run([cmd, '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return cmd
        except:
            pass
    return 'node'

def find_tdk_dir():
    d = os.environ.get('TDK_DIR')
    if d and os.path.exists(os.path.join(d, 'bin', 'tdk-render.js')):
        return d
    current = Path(__file__).resolve()
    for parent in [current.parent, current.parent.parent, current.parent.parent.parent]:
        candidate = parent / 'bin' / 'tdk-render.js'
        if candidate.exists():
            return str(parent)
    return None

def render_with_tdk(domain, chart_type, input_data, fmt='png', output_path=None, dpi=200):
    """调用 TDK Node.js CLI 渲染图表"""
    tdk_dir = find_tdk_dir()
    if not tdk_dir:
        raise RuntimeError('TDK 目录未找到。请设置 TDK_DIR 环境变量。')

    node = find_node()
    script = os.path.join(tdk_dir, 'bin', 'tdk-render.js')

    if output_path is None:
        output_path = os.path.join(tempfile.gettempdir(), f'tdk_{domain}_{chart_type}_{os.getpid()}.{fmt}')

    payload = {
        'domain': domain,
        'type': chart_type,
        'input': input_data,
        'format': fmt,
        'outputPath': os.path.abspath(output_path),
        'dpi': dpi,
    }

    cmd = [node, script, json.dumps(payload)]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

    if result.returncode != 0:
        raise RuntimeError(f'TDK 渲染失败: {result.stderr}\nstdout: {result.stdout}')

    try:
        output = json.loads(result.stdout.strip().split('\n')[-1])
    except json.JSONDecodeError:
        raise RuntimeError(f'TDK 输出解析失败: {result.stdout}')

    if not output.get('success'):
        raise RuntimeError(f'TDK 渲染失败: {output.get("error", "未知错误")}')

    return output

# ============================================================================
# PDF 样式
# ============================================================================
def create_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='CoverTitle', fontName=CN_FONT, fontSize=26, leading=34,
        textColor=C_DARK, alignment=1, spaceAfter=20,
    ))
    styles.add(ParagraphStyle(
        name='H1', fontName=CN_FONT, fontSize=17, leading=24,
        textColor=C_ACCENT, spaceBefore=18, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name='H2', fontName=CN_FONT, fontSize=13, leading=19,
        textColor=C_DARK, spaceBefore=14, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name='Body', fontName=CN_FONT, fontSize=9.5, leading=15,
        textColor=C_DARK, spaceBefore=3, spaceAfter=3, firstLineIndent=18,
    ))
    styles.add(ParagraphStyle(
        name='Caption', fontName=CN_FONT, fontSize=8, leading=12,
        textColor=C_LIGHT, alignment=1, spaceBefore=4, spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name='BulletCN', fontName=CN_FONT, fontSize=9.5, leading=15,
        textColor=C_DARK, spaceBefore=2, spaceAfter=2,
        leftIndent=24, bulletIndent=12, bulletFontName=CN_FONT, bulletText='•',
    ))
    styles.add(ParagraphStyle(
        name='SummaryBox', fontName=CN_FONT, fontSize=9, leading=14,
        textColor=C_DARK, spaceBefore=6, spaceAfter=6,
        leftIndent=10, rightIndent=10,
        backColor=colors.Color(0.94, 0.96, 1.0),
        borderWidth=1, borderColor=C_ACCENT, borderPadding=8, borderRadius=4,
    ))
    return styles

def header_footer(canvas, doc, title=''):
    canvas.saveState()
    canvas.setStrokeColor(C_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_X, PAGE_H - 1.5*cm, PAGE_W - MARGIN_X, PAGE_H - 1.5*cm)
    canvas.setFont(CN_FONT, 8)
    canvas.setFillColor(C_LIGHT)
    canvas.drawString(MARGIN_X, PAGE_H - 1.2*cm, title or '研究报告')
    canvas.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 1.2*cm, '2026-05-31')
    canvas.line(MARGIN_X, 1.5*cm, PAGE_W - MARGIN_X, 1.5*cm)
    canvas.drawCentredString(PAGE_W/2, 1.0*cm, f'- {doc.page} -')
    canvas.restoreState()

# ============================================================================
# 核心: embed_image 改进版
# ============================================================================
def embed_image_smart(path, layout_mode='fullwidth', source_dpi=200, caption=''):
    """智能嵌入图片，返回 ReportLab flowables 列表"""
    if not os.path.exists(path):
        return [Paragraph(f'<i>[图片未找到: {path}]</i>',
            ParagraphStyle(name='err', fontName=CN_FONT, fontSize=8, textColor=colors.red))]

    w_pt, h_pt, needs_break, scale = calculate_embed_size(path, layout_mode, source_dpi)

    flowables = []
    if needs_break:
        flowables.append(PageBreak())

    img = Image(path, width=w_pt, height=h_pt)

    if layout_mode == 'standalone':
        avail_h = CONTENT_H * 0.9
        if h_pt > avail_h:
            ratio = avail_h / h_pt
            w_pt *= ratio
            h_pt = avail_h
            img = Image(path, width=w_pt, height=h_pt)
        flowables.append(Spacer(1, CONTENT_H * 0.05))
        flowables.append(img)
        flowables.append(Spacer(1, CONTENT_H * 0.05))
    else:
        flowables.append(img)

    if caption:
        cap_style = ParagraphStyle(name='Caption', fontName=CN_FONT, fontSize=8, leading=12,
                                    textColor=C_LIGHT, alignment=1, spaceBefore=4, spaceAfter=10)
        flowables.append(Paragraph(f'图: {caption}', cap_style))

    return flowables

# ============================================================================
# PDF 报告构建器
# ============================================================================
class PdfReportBuilder:
    """
    带 TDK 集成的 PDF 报告构建器

    用法:
        builder = PdfReportBuilder('output/report.pdf', title='AI芯片研究报告')
        builder.add_cover('AI芯片交换技术深度研究报告', '推理芯片与边缘端侧芯片交换技术四层穿透分析')
        builder.add_heading('一、技术知识层', level=1)
        builder.add_paragraph('光模块是光纤通信系统中...')
        builder.add_diagram('chip', 'noc', {'meshSize': 4}, layout='fullwidth', caption='4x4 Mesh NoC架构')
        builder.add_heading('二、物理公式', level=2)
        builder.add_diagram('physics', 'formula', {'latex': 'E = mc^2'}, layout='inline', caption='质能方程')
        builder.build()
    """

    def __init__(self, output_path, title=''):
        self.output_path = output_path
        self.title = title
        self.styles = create_styles()
        self.story = []
        self.diagram_counter = 0
        self._setup_doc()

    def _setup_doc(self):
        self.doc = SimpleDocTemplate(
            self.output_path,
            pagesize=A4,
            rightMargin=MARGIN_X,
            leftMargin=MARGIN_X,
            topMargin=2.5*cm,
            bottomMargin=MARGIN_Y,
        )
        frame = Frame(MARGIN_X, MARGIN_Y, CONTENT_W, CONTENT_H, id='normal')
        template = PageTemplate(id='main', frames=frame, onPage=lambda c, d: header_footer(c, d, self.title))
        self.doc.addPageTemplates([template])

    def add_cover(self, main_title, subtitle=''):
        self.story.append(Spacer(1, 6*cm))
        self.story.append(Paragraph(main_title, self.styles['CoverTitle']))
        if subtitle:
            sub_style = ParagraphStyle(name='Sub', fontName=CN_FONT, fontSize=12, leading=18,
                                       textColor=C_MID, alignment=1, spaceBefore=10)
            self.story.append(Paragraph(subtitle, sub_style))
        self.story.append(Spacer(1, 4*cm))
        self.story.append(PageBreak())

    def add_heading(self, text, level=1):
        style = self.styles['H1'] if level == 1 else self.styles['H2']
        self.story.append(Paragraph(text, style))

    def add_paragraph(self, text):
        self.story.append(Paragraph(text, self.styles['Body']))

    def add_bullet(self, text):
        self.story.append(Paragraph(text, self.styles['BulletCN']))

    def add_summary_box(self, text):
        self.story.append(Paragraph(text, self.styles['SummaryBox']))

    def add_page_break(self):
        self.story.append(PageBreak())

    def add_image(self, img_path, layout='fullwidth', caption='', source_dpi=200):
        """直接嵌入预生成的图片文件"""
        if not os.path.exists(img_path):
            err_style = ParagraphStyle(name='err', fontName=CN_FONT, fontSize=8, textColor=colors.red)
            self.story.append(Paragraph(f'[图片未找到: {img_path}]', err_style))
            return
        self.diagram_counter += 1
        cap = caption or f'图 #{self.diagram_counter}'
        flowables = embed_image_smart(img_path, layout, source_dpi=source_dpi, caption=cap)
        self.story.extend(flowables)

    def add_diagram(self, domain, chart_type, input_data, layout='fullwidth', caption='', fmt='png', dpi=200):
        """调用 TDK 渲染图表并嵌入 PDF"""
        self.diagram_counter += 1
        try:
            result = render_with_tdk(domain, chart_type, input_data, fmt=fmt, dpi=dpi)
            img_path = result['path']
            cap = caption or f'{domain}.{chart_type} #{self.diagram_counter}'
            flowables = embed_image_smart(img_path, layout, source_dpi=dpi, caption=cap)
            self.story.extend(flowables)
        except Exception as e:
            err_style = ParagraphStyle(name='err', fontName=CN_FONT, fontSize=8, textColor=colors.red)
            self.story.append(Paragraph(f'[图表渲染失败: {e}]', err_style))

    def add_table(self, data, col_widths, style_overrides=None):
        """添加表格"""
        t = Table(data, colWidths=col_widths, repeatRows=1)
        base = [
            ('FONTNAME', (0, 0), (-1, -1), CN_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('TEXTCOLOR', (0, 0), (-1, -1), C_DARK),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 0), (-1, 0), C_ACCENT),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ]
        if style_overrides:
            base.extend(style_overrides)
        t.setStyle(TableStyle(base))
        self.story.append(t)
        self.story.append(Spacer(1, 0.3*cm))

    def build(self):
        self.doc.build(self.story)
        size = os.path.getsize(self.output_path)
        print(f'[OK] PDF 报告已生成: {self.output_path} ({size/1024:.1f} KB)')
        return self.output_path


# ============================================================================
# CLI 入口
# ============================================================================
def main():
    if len(sys.argv) < 2:
        print('Usage: python pdf_assembler.py <report.json> [output.pdf]')
        sys.exit(1)

    json_path = sys.argv[1]
    pdf_path = sys.argv[2] if len(sys.argv) > 2 else 'output/report.pdf'

    with open(json_path, 'r', encoding='utf-8') as f:
        spec = json.load(f)

    builder = PdfReportBuilder(pdf_path, title=spec.get('title', ''))

    for item in spec.get('content', []):
        kind = item.get('type', 'paragraph')
        if kind == 'cover':
            builder.add_cover(item['title'], item.get('subtitle', ''))
        elif kind == 'heading':
            builder.add_heading(item['text'], item.get('level', 1))
        elif kind == 'paragraph':
            builder.add_paragraph(item['text'])
        elif kind == 'bullet':
            builder.add_bullet(item['text'])
        elif kind == 'summary':
            builder.add_summary_box(item['text'])
        elif kind == 'pagebreak':
            builder.add_page_break()
        elif kind == 'image':
            builder.add_image(
                item['path'],
                layout=item.get('layout', 'fullwidth'),
                caption=item.get('caption', ''),
                source_dpi=item.get('dpi', 200)
            )
        elif kind == 'diagram':
            builder.add_diagram(
                item['domain'], item['chartType'], item.get('input', {}),
                layout=item.get('layout', 'fullwidth'),
                caption=item.get('caption', ''),
                fmt=item.get('format', 'png'),
                dpi=item.get('dpi', 200)
            )
        elif kind == 'table':
            cw = item.get('colWidths', [])
            col_widths = [w*cm for w in cw] if cw else None
            builder.add_table(item['data'], col_widths)

    builder.build()


if __name__ == '__main__':
    main()
