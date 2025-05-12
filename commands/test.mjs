import * as esbuild from 'esbuild';
import { createBuildSettings } from './settings.mjs';

const settings = createBuildSettings({ minify: false });
await esbuild.build(settings);