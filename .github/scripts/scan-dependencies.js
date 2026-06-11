#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 扫描所有依赖并下载到本地
 * 用于创建完全离线的依赖包
 */

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const DEPS_DIR = path.join(REPO_ROOT, 'offline_dependencies');
const NPM_CACHE_DIR = path.join(REPO_ROOT, '.npm-cache');

// 创建必要的目录
if (!fs.existsSync(DEPS_DIR)) {
  fs.mkdirSync(DEPS_DIR, { recursive: true });
}

if (!fs.existsSync(NPM_CACHE_DIR)) {
  fs.mkdirSync(NPM_CACHE_DIR, { recursive: true });
}

const packageJsonPath = path.join(REPO_ROOT, 'package.json');
const lockfilePath = path.join(REPO_ROOT, 'package-lock.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const dependencies = {
  ...packageJson.dependencies || {},
  ...packageJson.devDependencies || {},
  ...packageJson.optionalDependencies || {},
};

console.log(`📦 Found ${Object.keys(dependencies).length} dependencies`);
console.log('🔍 Scanning and downloading dependencies...');

let downloaded = 0;
let errors = 0;
const errorLog = [];

// 下载所有依赖
for (const [name, version] of Object.entries(dependencies)) {
  try {
    console.log(`  Downloading: ${name}@${version}`);
    
    // 使用 npm pack 下载tarball
    const packCommand = `npm pack ${name}@"${version}" --pack-destination "${DEPS_DIR}" 2>&1`;
    execSync(packCommand, { stdio: 'pipe' });
    
    downloaded++;
  } catch (error) {
    errors++;
    const msg = `❌ Failed to download ${name}@${version}: ${error.message}`;
    console.error(msg);
    errorLog.push(msg);
  }
}

console.log(`\n✅ Downloaded: ${downloaded}`);
console.log(`❌ Errors: ${errors}`);

if (errorLog.length > 0) {
  fs.writeFileSync(
    path.join(REPO_ROOT, 'scan-errors.log'),
    errorLog.join('\n')
  );
  console.log('\n📝 Error log saved to: scan-errors.log');
}

// 尝试使用 npm ci --prefer-offline --no-audit 来准备缓存
try {
  console.log('\n📥 Building npm cache...');
  execSync(`npm ci --prefer-offline --no-audit --cache "${NPM_CACHE_DIR}" 2>&1`, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  console.log('✅ NPM cache built successfully');
} catch (error) {
  console.error('⚠️ Failed to build npm cache:', error.message);
}

// 生成依赖报告
const report = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
  totalDependencies: Object.keys(dependencies).length,
  downloaded,
  errors,
  dependencies: Object.entries(dependencies).map(([name, version]) => ({
    name,
    version,
  })),
};

fs.writeFileSync(
  path.join(REPO_ROOT, 'DEPENDENCIES.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📋 Dependency report saved to: DEPENDENCIES.json');
console.log(`\n🎉 Scan completed! (${downloaded}/${Object.keys(dependencies).length} packages)`);
