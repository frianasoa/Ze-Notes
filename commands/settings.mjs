// import { sassPlugin } from 'esbuild-sass-plugin';
// import CssModulesPlugin from 'esbuild-css-modules-plugin';

export function createBuildSettings(options) {
  return {
    entryPoints: ['src/index.ts'],
    outfile: 'app/chrome/core/engine.js',
    bundle: true,
    target: "firefox115",
    globalName: 'Engine',
    platform: 'browser',
    format: "iife",
    inject: [
      "commands/esbuild.inject.js"
    ],
    define: {
      'process.env.NODE_ENV': '"development"',
      'global': 'globalThis'
    },
    plugins: [],
    // plugins: [CssModulesPlugin(), sassPlugin({type: "style"})],
    ...options
  };
}