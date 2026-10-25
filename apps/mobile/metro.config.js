const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// pnpm monorepo 接入（ADR-M-001 §3 / spike 判据 1）：
// watchFolders 提升到 workspace 根，让 Metro 能解析 @ordo/shared（workspace:* 符号链接）
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
