module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Rewrites `import.meta` → `globalThis.__ExpoImportMetaRegistry`
          // so the web bundle doesn't crash with "Cannot use 'import.meta' outside a module"
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
