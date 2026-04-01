#!/usr/bin/env node
/**
 * 版本更新脚本
 * 用法: node scripts/version.js [version] [message]
 * 例如: node scripts/version.js 2.0.1 "添加新功能"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANGELOG_PATH = path.join(__dirname, '..', 'changelog', 'CHANGELOG.md');
const PKG_PATH = path.join(__dirname, '..', 'package.json');

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  return pkg.version;
}

function updateChangelog(version, message) {
  const today = new Date().toISOString().split('T')[0];
  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');

  const entry = `## [${version}] - ${date}

### ${message || 'No significant changes'}
`;

  let content = fs.readFileSync(CHANGELOG_PATH, 'utf8');

  // 找到第一个 ### 的位置
  const firstHeaderIdx = content.search(/^## \[/m);
  if (firstHeaderIdx === -1) {
    content = entry + '\n' + content;
  } else {
    content = content.slice(0, firstHeaderIdx) + entry + '\n' + content.slice(firstHeaderIdx);
  }

  fs.writeFileSync(CHANGELOG_PATH, content);
  console.log(`✓ Updated changelog with v${version}`);
}

function updatePackageVersion(version) {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Updated package.json to v${version}`);
}

function getGitChanges() {
  try {
    const { execSync } = require('child_process');
    const diff = execSync('git diff --stat HEAD', { encoding: 'utf8' }).trim();
    return diff;
  } catch {
    return '（请手动查看 git diff）';
  }
}

// 主逻辑
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
用法: node scripts/version.js [version] [message]

参数:
  version    版本号 (例如: 2.0.1)
  message    更新类型 (例如: Added, Changed, Fixed)

示例:
  node scripts/version.js 2.0.1 "添加新功能"
  node scripts/version.js 2.0.1 "Fixed bug"
  `);
  process.exit(0);
}

const version = args[0];
const message = args[1] || 'No significant changes';

// 验证版本号格式
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error('✗ 版本号格式错误，应为 x.y.z (例如: 2.0.1)');
  process.exit(1);
}

console.log('\n📝 Generating version entry...\n');
console.log(`Version: ${version}`);
console.log(`Message: ${message}`);
console.log(`\nChanged files:`);
console.log(getGitChanges());
console.log();

updateChangelog(version, message);
updatePackageVersion(version);

console.log('\n✅ Done! 请检查 changelog/CHANGELOG.md 确认内容。\n');
console.log('接下来可以提交:');
console.log(`  git add -A`);
console.log(`  git commit -m "Release v${version}"\n`);
