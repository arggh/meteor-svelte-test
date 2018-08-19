Package.describe({
  name: 'svelte:compiler',
  version: '2.6.0',
  summary: 'Svelte compiler',
  git: 'https://github.com/meteor-svelte/meteor-svelte.git',
  documentation: '../README.md'
});

Package.registerBuildPlugin({
  name: 'svelte-compiler',
  use: ['ecmascript', 'svelte:core@2.6.0'],
  sources: [
    'plugin.js'
  ],
  npmDependencies: {
    'find-up': '2.1.0'
  }
});

Package.onUse(function (api) {
  api.use('isobuild:compiler-plugin@1.0.0');
});
