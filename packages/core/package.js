Package.describe({
  name: 'svelte:core',
  version: '2.6.0',
  summary: 'Svelte compiler core',
  git: 'https://github.com/meteor-svelte/meteor-svelte.git'
});

Npm.depends({
  htmlparser2: '3.9.2',
  'source-map': '0.5.6',
  svelte: '2.10.1',
  postcss: '7.0.2',
  'postcss-load-config': '2.0.0'
});

Package.onUse(function (api) {
  api.versionsFrom('1.6');

  // Dependencies for `SvelteCompiler`
  api.use([
    'caching-compiler@1.1.11',
    'babel-compiler@6.24.7||7.0.0',
    'ecmascript'
  ]);

  // Dependencies for compiled Svelte components
  api.imply([
    'modules',
    'ecmascript-runtime',
    'babel-runtime',
    'promise'
  ]);

  // Make `SvelteCompiler` available to build plugins.
  api.mainModule('svelte-compiler.js');
  api.export('SvelteCompiler', 'server');
});
