import * as esbuild from 'esbuild';
import fs from 'node:fs';
import { createBuildSettings } from './settings.mjs';

const settings = createBuildSettings({ minify: true, metafile: true });
const result = await esbuild.build(settings);
const mode = process.env.npm_config_mode;

if (mode === "write") {
  fs.writeFileSync("build-meta.json", JSON.stringify(result.metafile))
} else {
  console.log(await esbuild.analyzeMetafile(result.metafile, {
    verbose: false,
  }));
}