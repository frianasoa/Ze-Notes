import * as esbuild from 'esbuild';
import { createBuildSettings } from './settings.mjs';
import { typecheckPlugin } from '@jgoz/esbuild-plugin-typecheck';

const settings = createBuildSettings({ minify: false});
settings.plugins.push(typecheckPlugin())
await esbuild.build(settings);