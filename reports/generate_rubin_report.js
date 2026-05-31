const reporter = require('../index.js');

const struct = [
  { type: 'cover', title: 'HDI与NVIDIA Rubin架构关系深度研究报告', subtitle: '从Cableless架构看PCB产业价值重构' },
  
  { type: 'heading', text: '执行摘要', level: 1 },
  { type: 'summary', text: 'NVIDIA Rubin平台采用Cableless（无缆化）架构，GPU与Switch之间的高速连接不再依赖线缆，而是通过多层HDI PCB直接走线。Switch Tray采用24层HDI（M8U材料），Midplane与CX9/CPX板最高达104层（M9材料），正交背板达78-87层。PCB单服务器价值量是Blackwell时代的2倍以上，HDI从被动载体跃升为算力核心层。' },
  
  { type: 'heading', text: '第一部分：Rubin架构概述', level: 1 },
  { type: 'heading', text: '一、核心规格', level: 2 },
  { type: 'paragraph', text: 'Rubin是NVIDIA于2026年发布的下一代AI加速平台，采用TSMC 3nm工艺，双芯片设计，3360亿晶体管，配备288GB HBM4（22 TB/s带宽），FP4推理性能达50 PFLOPS，较Blackwell提升2.5-5倍。' },
  { type: 'table', data: [
    ['指标', 'Rubin (2026)', 'Blackwell (2025)', '提升幅度'],
    ['晶体管', '3360亿', '2080亿', '1.6x'],
    ['HBM容量', '288GB HBM4', '192GB HBM3e', '1.5x'],
    ['内存带宽', '22 TB/s', '8 TB/s', '2.75x'],
    ['FP4推理', '50 PFLOPS', '10-20 PFLOPS', '2.5-5x'],
    ['NVLink带宽', '3.6 TB/s', '1.8 TB/s', '2x'],
    ['TDP', '~2300W', '~1200W', '1.9x']
  ]},
  
  { type: 'heading', text: '二、Vera Rubin平台组成', level: 2 },
  { type: 'paragraph', text: 'Vera Rubin平台是一个完整的AI工厂蓝图，采用七芯片协同设计：Rubin GPU（计算）、Vera CPU（88核Olympus ARM）、NVLink 6 Switch（互连）、ConnectX-9 SuperNIC（网络）、BlueField-4 DPU（存储与安全）、Spectrum-6以太网交换机、Groq 3 LPU（推理解码）。' },
  { type: 'diagram', ref: 'fig_rubin_arch', layout: 'standalone', caption: 'Vera Rubin NVL72 系统架构' },
  
  { type: 'heading', text: '三、Cableless架构理念', level: 2 },
  { type: 'paragraph', text: 'Rubin世代最大的架构变革是Cableless（无缆化）设计。过去GPU与Switch间的高速传输依赖线缆，如今改由Switch Tray、Midplane、CX9/CPX板等多层HDI PCB直接走线。机架采用无风扇、无管路、无线缆设计，组装时间从1.5小时缩短至5分钟。' },
  
  { type: 'heading', text: '第二部分：HDI技术解析', level: 1 },
  { type: 'heading', text: '四、HDI核心参数', level: 2 },
  { type: 'paragraph', text: 'HDI（High Density Interconnect，高密度互连）是PCB制造中的高端技术，通过微盲孔、埋孔和细线宽/线距实现更高的布线密度。Rubin平台对HDI的要求达到前所未有的高度。' },
  { type: 'table', data: [
    ['PCB类型', '层数', '材料等级', '关键参数', '信号速率'],
    ['Switch Tray', '24层', 'M8U', 'Low-Dk2 + HVLP4', '224 Gbps'],
    ['Midplane', '最高104层', 'M9', 'Q-glass + HVLP4', '224 Gbps'],
    ['CX9/CPX板', '最高104层', 'M9', 'Q-glass + HVLP4', '224 Gbps'],
    ['正交背板', '78-87层', 'M9+', '石英布方案', '224 Gbps']
  ]},
  
  { type: 'heading', text: '五、材料升级', level: 2 },
  { type: 'paragraph', text: 'Rubin全面升级材料体系：M9级覆铜板采用Q-glass石英布和HVLP4超低轮廓铜箔，在224 Gbps传输速率下信号衰减<5%（M8材料>30%），误码率<0.01%（M8材料>5%），热膨胀系数较传统材料降低约30%。' },
  
  { type: 'heading', text: '第三部分：HDI在Rubin中的架构角色', level: 1 },
  { type: 'heading', text: '六、HDI承载的信号类型', level: 2 },
  { type: 'paragraph', text: '在Rubin的Cableless架构中，HDI PCB承载三类关键信号：NVLink 6 GPU-to-GPU互连（3.6 TB/s每GPU）、NVLink-C2C CPU-to-GPU互连、以及PCIe Gen6/以太网扩展信号。所有高速信号均在PCB内部走线完成，不再外接线缆。' },
  { type: 'diagram', ref: 'fig_hdi_role', layout: 'fullwidth', caption: 'HDI在Rubin Cableless架构中的角色' },
  
  { type: 'heading', text: '七、NVLink 6互连拓扑', level: 2 },
  { type: 'paragraph', text: 'NVLink 6提供3.6 TB/s每GPU的带宽，NVL72机架总带宽达260 TB/s。72个GPU通过Switch Tray内的NVLink 6 Switch ASIC实现全连接，任意两个GPU之间的通信延迟极低。这种全互连拓扑对PCB的信号完整性和电源完整性提出了极高要求。' },
  { type: 'diagram', ref: 'fig_nvlink_topo', layout: 'fullwidth', caption: 'NVLink 6 全互连拓扑示意图' },
  
  { type: 'heading', text: '第四部分：供应链竞争格局', level: 1 },
  { type: 'paragraph', text: 'Rubin架构推动PCB产业进入高频、高功耗、高密度的"三高时代"，中国企业在全球供应链中占据关键位置。' },
  { type: 'table', data: [
    ['企业', '核心产品', 'Rubin相关地位', '2025年AI营收'],
    ['胜宏科技', '57层HDI板、正交背板', 'Rubin正交背板唯一验证通过', '~135亿元'],
    ['沪电股份', '40-78层高多层背板', '高多层/背板龙头，Rubin主力', '~70亿元'],
    ['生益科技', '覆铜板基材', '78层正交背板核心基材', '-'],
    ['菲利华', '石英布', '石英布产能被英伟达独家锁定', '-']
  ]},
  { type: 'diagram', ref: 'fig_supply_chain', layout: 'fullwidth', caption: 'Rubin PCB供应链竞争格局' },
  
  { type: 'heading', text: '第五部分：关键结论', level: 1 },
  { type: 'bullet', text: 'Rubin Cableless架构使HDI PCB从被动载体跃升为算力核心层，信号完整性成为设计首要目标' },
  { type: 'bullet', text: 'PCB单服务器价值量是Blackwell时代的2倍以上，M9级材料渗透率快速提升' },
  { type: 'bullet', text: '2026年计划出货100万颗芯片，需要50万平方米M9材料PCB，市场空间突破1400亿元' },
  { type: 'bullet', text: '胜宏科技为全球唯一量产57层HDI板并通过Rubin验证的供应商，技术壁垒极高' },
  { type: 'bullet', text: 'Rubin之后的Rubin Ultra（2027年）将采用4光罩尺寸、1TB HBM4e、NVLink 7，PCB层数要求将进一步提升' }
];

const desc = [
  {
    id: 'fig_rubin_arch',
    domain: 'ai',
    chartType: 'neuralnet',
    input: { layers: [8, 12, 16, 12, 8, 4], title: 'Vera Rubin 七芯片协同架构' },
    caption: 'Vera Rubin 七芯片协同架构（每层代表一类芯片）'
  },
  {
    id: 'fig_hdi_role',
    domain: 'math',
    chartType: 'formula',
    input: { latex: '\\alpha_{M9}(224Gbps) < 5\\% \\ll \\alpha_{M8}(224Gbps) > 30\\%' },
    caption: 'M9 vs M8 材料在224 Gbps下的信号衰减对比'
  },
  {
    id: 'fig_nvlink_topo',
    domain: 'chip',
    chartType: 'noc',
    input: { topology: 'mesh', nodes: ['GPU0','GPU1','GPU2','GPU3','GPU4','GPU5','GPU6','GPU7','SW'], size: 3 },
    caption: 'NVLink 6 全互连拓扑示意图'
  },
  {
    id: 'fig_supply_chain',
    domain: 'general',
    chartType: 'chart',
    input: { chartType: 'bar', labels: ['胜宏科技','沪电股份','世运电路','其他'], values: [50, 30, 7, 13] },
    caption: '英伟达PCB供应链份额（%）'
  }
];

reporter.generatePdf({
  context: 'HDI与NVIDIA Rubin架构关系深度研究报告',
  struct,
  desc,
  outputPath: 'E:/Skills_Creator/research-result2pdf-skill/reports/HDI_Rubin_Research_Report.pdf'
}).then(r => {
  console.log('Result:', JSON.stringify(r, null, 2));
}).catch(e => {
  console.error('Error:', e.message);
});
