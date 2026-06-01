const reporter = require('../index.js');

const struct = [
  { type: 'cover', title: 'HDI与正交电路板作用关系深度解析', subtitle: '从模组级互连到机架级背板的技术演进与协同机制' },
  
  { type: 'heading', text: '一、核心概念定义', level: 1 },
  { type: 'paragraph', text: '在AI服务器架构中，HDI（High Density Interconnect，高密度互连板）和正交电路板（Orthogonal Backplane）是两个不同层级但紧密协作的PCB类型。HDI负责模组级信号布线，正交背板负责机架级信号汇聚与分发。' },
  
  { type: 'heading', text: '二、HDI的作用与层级', level: 1 },
  { type: 'paragraph', text: 'HDI通过微盲孔、埋孔和细线宽/线距（L/S≤30/30μm）实现高密度布线。在AI服务器中存在三个层级的HDI应用：' },
  { type: 'bullet', text: 'OAM HDI（GPU基板）：承载GPU与HBM之间的信号，层数30-50层，线宽/线距≤20μm' },
  { type: 'bullet', text: 'UBB HDI（通用基板）：承载多GPU互连与电源分配，层数40-60层，支持NVLink走线' },
  { type: 'bullet', text: 'Switch Tray HDI（交换机托盘）：承载NVLink Switch ASIC与外部连接，层数24-50层' },
  { type: 'diagram', ref: 'fig_hdi_layers', layout: 'fullwidth', caption: 'AI服务器中三层HDI的层级关系' },
  
  { type: 'heading', text: '三、正交电路板的核心作用', level: 1 },
  { type: 'paragraph', text: '正交背板（Orthogonal Backplane）是一种垂直于主板安装的PCB，所有子卡（Line Card）与主板以90度正交方式插入。相比传统平行背板，正交架构将背板走线长度缩短50%以上，信号损耗降低40%。' },
  { type: 'table', data: [
    ['对比项', '传统平行背板', '正交背板（Rubin）'],
    ['信号路径', '子卡→背板→另一子卡（U型）', '子卡→正交连接器→对面子卡（直线）'],
    ['走线长度', '较长（需迂回）', '缩短50%以上'],
    ['信号损耗', '较高', '降低40%'],
    ['支持层数', '20-40层', '78-87层（Rubin Ultra）'],
    ['信号速率', '56-112 Gbps', '224 Gbps'],
    ['代表供应商', '日月光、TTM', '胜宏科技（全球独家验证）']
  ]},
  
  { type: 'heading', text: '四、HDI与正交背板的协同机制', level: 1 },
  { type: 'paragraph', text: 'HDI与正交背板并非替代关系，而是层级递进关系。信号从GPU出发，依次经过OAM HDI、UBB HDI、Switch Tray HDI，最终通过正交背板到达机架另一侧的计算节点。整个链路中，HDI负责"最后一公里"的高密度布线，正交背板负责"跨节点"的直线路由。' },
  { type: 'diagram', ref: 'fig_signal_flow', layout: 'standalone', caption: '信号从GPU到正交背板的完整传输链路' },
  
  { type: 'heading', text: '五、Rubin架构中的实际部署', level: 1 },
  { type: 'paragraph', text: '在Vera Rubin NVL72机架中，72个GPU分为36组，每组2个GPU安装在1块UBB上。36块UBB从机架正面插入，36个Switch Tray从机架背面插入，两者通过正交背板直接对接。这种设计完全消除了线缆，所有高速信号均在PCB内部完成传输。' },
  { type: 'diagram', ref: 'fig_rubin_rack', layout: 'fullwidth', caption: 'Rubin NVL72机架正交背板部署示意图' },
  
  { type: 'heading', text: '六、关键结论', level: 1 },
  { type: 'bullet', text: 'HDI是正交背板的"前端延伸"：正交背板本身也是HDI技术的最高层级体现（78-87层）' },
  { type: 'bullet', text: '两者协同实现Cableless：HDI负责模组内，正交背板负责机架间，共同替代传统线缆' },
  { type: 'bullet', text: '信号完整性是共同挑战：224 Gbps速率下，HDI的任意层互连（Any Layer HDI）与正交背板的低损耗材料缺一不可' },
  { type: 'bullet', text: '供应链高度集中：胜宏科技是唯一同时具备57层HDI和78层正交背板量产能力的供应商' }
];

const desc = [
  {
    id: 'fig_hdi_layers',
    domain: 'general',
    chartType: 'chart',
    input: { chartType: 'bar', labels: ['OAM HDI','UBB HDI','Switch Tray HDI','正交背板'], values: [40, 50, 35, 82] },
    caption: 'AI服务器各层级PCB层数对比'
  },
  {
    id: 'fig_signal_flow',
    domain: 'ai',
    chartType: 'neuralnet',
    input: { layers: [8, 6, 4, 3, 2], title: 'GPU信号→正交背板传输链路' },
    caption: '信号从GPU到正交背板的层级递进（每层代表一类PCB）'
  },
  {
    id: 'fig_rubin_rack',
    domain: 'general',
    chartType: 'chart',
    input: { chartType: 'bar', labels: ['UBB正面插入','正交背板','Switch Tray背面插入'], values: [36, 1, 36] },
    caption: 'Rubin NVL72机架正交背板部署（36+1+36架构）'
  }
];

reporter.generatePdf({
  context: 'HDI与正交电路板作用关系深度解析',
  struct,
  desc,
  outputPath: 'E:/Skills_Creator/research-result2pdf-skill/reports/HDI_Orthogonal_Relationship.pdf'
}).then(r => {
  console.log('Result:', JSON.stringify(r, null, 2));
}).catch(e => {
  console.error('Error:', e.message);
});
