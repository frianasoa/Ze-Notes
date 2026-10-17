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
    // exceljs's default browser build bundles core-js, which patches globals
    // (e.g. Symbol.useSetter). Zotero 11 (Fx 153) freezes privileged builtins,
    // so that throws at load time. The bare build has no polyfills.
    alias: {
      'exceljs': 'exceljs/dist/exceljs.bare.min.js'
    },
    plugins: [],
    // plugins: [CssModulesPlugin(), sassPlugin({type: "style"})],
    ...options
  };
}