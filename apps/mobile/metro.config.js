const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The repo lives on an exFAT drive: macOS scatters AppleDouble "._*" files
// that Metro/expo-router would otherwise treat as source files and routes.
const appleDouble = /(^|[\\/])\._[^\\/]*$/;
const existing = config.resolver.blockList;
config.resolver.blockList = [appleDouble].concat(existing ?? []);

module.exports = config;
