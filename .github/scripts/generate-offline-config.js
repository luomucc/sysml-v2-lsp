#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 生成离线安装所需的配置文件
 */

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const VERSION = process.argv[2] || 'unknown';

// 1. 生成 .npmrc 配置文件
const npmrc = `# Offline NPM Configuration
# 用于离线或内网环境中的 npm 包安装

# 本地包缓存目录
cache=${path.join(REPO_ROOT, '.npm-cache')}

# 优先使用离线缓存
prefer-offline=true

# 跳过完整性检查
verify-store-integrity=false

# 不检查更新
update-notifier=false

# 使用 tar 包而不是 git
fetch-retry-mintimeout=5000
fetch-retry-maxtimeout=30000
fetch-retries=5

# 可选：配置私有 registry（使用 verdaccio）
# registry=http://localhost:4873/
# //localhost:4873/:_authToken=your-token
`;

fs.writeFileSync(
  path.join(REPO_ROOT, 'offline_npmrc'),
  npmrc
);

console.log('✅ Generated: offline_npmrc');

// 2. 生成离线安装指南
const installGuide = `# Offline Installation Guide

## 文件清单

本次打包包含以下文件：

- \`source-${VERSION}.tar.gz\` - 源代码
- \`dependencies-${VERSION}.tar.gz\` - 离线依赖包（如果生成）
- \`npm-cache-${VERSION}.tar.gz\` - NPM 缓存（如果生成）
- \`offline_npmrc\` - NPM 配置文件
- \`DEPENDENCIES.json\` - 依赖清单
- \`SHA256SUMS\` - 校验文件
- \`OFFLINE_INSTALL.md\` - 本文件

## 步骤 1：验证完整性

\`\`\`bash
sha256sum -c SHA256SUMS
\`\`\`

## 步骤 2：解压源代码

\`\`\`bash
tar -xzf source-${VERSION}.tar.gz
cd sysml-v2-lsp
\`\`\`

## 步骤 3：配置离线环境

### 方案 A：使用本地 npm 缓存（推荐）

1. **解压 npm 缓存**
   \`\`\`bash
   tar -xzf npm-cache-${VERSION}.tar.gz
   \`\`\`

2. **配置 npm 使用离线缓存**
   \`\`\`bash
   cp offline_npmrc ~/.npmrc
   
   # 或使用项目级别的配置
   cp offline_npmrc .npmrc
   \`\`\`

3. **安装依赖**
   \`\`\`bash
   npm ci --prefer-offline --no-audit
   \`\`\`

### 方案 B：使用 Verdaccio 私有 Registry

1. **安装 Verdaccio**
   \`\`\`bash
   npm install -g verdaccio
   \`\`\`

2. **启动 Verdaccio**
   \`\`\`bash
   verdaccio
   \`\`\`

3. **解压依赖包到 Verdaccio 存储**
   \`\`\`bash
   tar -xzf dependencies-${VERSION}.tar.gz
   # 将文件复制到 ~/.local/share/verdaccio/storage/
   \`\`\`

4. **配置 npm 指向本地 registry**
   \`\`\`bash
   npm config set registry http://localhost:4873/
   \`\`\`

5. **安装依赖**
   \`\`\`bash
   npm ci
   \`\`\`

## 步骤 4：构建项目

\`\`\`bash
npm run build
\`\`\`

## 故障排除

### npm 仍然尝试连接网络

1. 检查 .npmrc 配置：
   \`\`\`bash
   npm config list
   \`\`\`

2. 禁用网络访问（可选）：
   \`\`\`bash
   npm config set offline true
   \`\`\`

### 缺少某些依赖

1. 查看 DEPENDENCIES.json 中的错误日志
2. 手动下载缺失的包
3. 将其复制到缓存目录

### 权限问题

- 如果遇到权限错误，尝试：
  \`\`\`bash
  chmod -R 755 .npm-cache/
  \`\`\`

## 内网部署

在内网环境部署时的建议：

1. **使用 Verdaccio 作为企业级 Registry**
   - 支持包缓存
   - 支持包访问控制
   - 支持 web UI

2. **定期更新离线包**
   - 建议每月检查上游更新
   - 定期生成新的离线包

3. **安全性考虑**
   - 验证所有 tarball 的 SHA256 校验和
   - 在部署前进行安全扫描
   - 使用内网 registry 限制包来源

## 支持的环境

- Node.js 18+
- npm 9+
- Linux/macOS/Windows

## 联系方式

如有问题，请参考上游项目或创建 issue。

---

**Generated**: ${new Date().toISOString()}
**Bundle Version**: ${VERSION}
`;

fs.writeFileSync(
  path.join(REPO_ROOT, 'OFFLINE_INSTALL.md'),
  installGuide
);

console.log('✅ Generated: OFFLINE_INSTALL.md');

// 3. 生成 Verdaccio 配置示例
const verdaccioConfig = `# Verdaccio 配置文件
# 用于离线/内网 npm registry

storage: ~/.local/share/verdaccio/storage

plugins: ~/.local/share/verdaccio/plugins

web:
  title: SysML v2 Offline Registry
  logo: https://verdaccio.org/logo.png

auth:
  htpasswd:
    file: ~/.local/share/verdaccio/htpasswd

uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    # 用于内网环境，可以禁用此 uplink
    # 或者指向代理

packages:
  '@*/*':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs
  '**':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs

server:
  keepAliveTimeout: 60

listen:
  - 0.0.0.0:4873

logs:
  - { type: stdout, format: pretty, level: http }
  - { type: file, format: json, level: info, file: ~/.local/share/verdaccio/verdaccio.log }
`;

fs.writeFileSync(
  path.join(REPO_ROOT, 'verdaccio-config.yaml'),
  verdaccioConfig
);

console.log('✅ Generated: verdaccio-config.yaml');

console.log(`\n🎉 All offline configuration files generated!`);
console.log(`📦 Version: ${VERSION}`);
