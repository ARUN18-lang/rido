const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Keep Metro scoped to this app (reduces file watchers in the monorepo)
config.watchFolders = [projectRoot];

const siblingDirs = ['rido-backend', 'rido-driver', 'rido-rider', 'cursor-prompts'].filter(
  (dir) => path.resolve(workspaceRoot, dir) !== projectRoot,
);

config.resolver.blockList = siblingDirs.map((dir) => {
  const escaped = path.resolve(workspaceRoot, dir).replace(/[/\\]/g, '[\\\\/]');
  return new RegExp(`${escaped}.*`);
});

module.exports = config;
