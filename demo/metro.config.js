// demo/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);

// tell Metro to watch your package folder
config.watchFolders = [path.resolve(__dirname, '..')];

module.exports = config;
