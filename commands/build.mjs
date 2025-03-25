import * as esbuild from 'esbuild';
import { createBuildSettings } from './settings.mjs';

const settings = createBuildSettings({ minify: true });
await esbuild.build(settings);