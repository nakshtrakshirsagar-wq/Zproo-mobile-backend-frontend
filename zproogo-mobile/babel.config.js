module.exports = {
  presets: ['module:@react-native/babel-preset'],
  env: {
    // strip console.* from release bundles (no debug info / PII in logcat)
    production: { plugins: ['transform-remove-console'] },
  },
};
