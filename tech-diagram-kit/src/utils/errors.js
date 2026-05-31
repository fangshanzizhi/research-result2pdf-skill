/**
 * 统一错误码体系
 */
class TdkError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'TdkError';
  }
}

const ErrorCode = {
  DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',
  INVALID_INPUT: 'INVALID_INPUT',
  RENDER_FAILED: 'RENDER_FAILED',
  TIMEOUT: 'TIMEOUT',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
};

const InstallGuide = {
  mermaid: {
    message: 'Mermaid CLI (mmdc) 未安装',
    cmd: 'npm install -g @mermaid-js/mermaid-cli'
  },
  d2: {
    message: 'D2 未安装',
    cmd: 'curl -fsSL https://d2lang.com/install.sh | sh -s --'
  },
  plantuml: {
    message: 'PlantUML 未安装',
    cmd: 'npm install -g plantuml  # 或下载 plantuml.jar'
  },
  graphviz: {
    message: 'Graphviz (dot) 未安装',
    cmd: 'Windows: choco install graphviz; macOS: brew install graphviz; Linux: apt install graphviz'
  },
  markmap: {
    message: 'markmap-cli 未安装',
    cmd: 'npm install -g markmap-cli'
  },
  matplotlib: {
    message: 'Python matplotlib 未安装',
    cmd: 'pip install matplotlib numpy'
  },
  rdkit: {
    message: 'Python RDKit 未安装',
    cmd: 'conda install -c conda-forge rdkit  # 或 pip install rdkit'
  },
  schemdraw: {
    message: 'Python schemdraw 未安装',
    cmd: 'pip install schemdraw'
  },
  mathjax: {
    message: 'mathjax-node 未安装',
    cmd: 'npm install mathjax-node mathjax-node-cli'
  },
};

module.exports = { TdkError, ErrorCode, InstallGuide };
