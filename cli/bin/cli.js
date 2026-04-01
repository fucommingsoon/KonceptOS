#!/usr/bin/env node
/**
 * KonceptOS CLI Bridge
 * 桥接到 cli/src/cli.js
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

const args = [cliPath, ...process.argv.slice(2)];
const proc = spawn('node', args, {
  stdio: 'inherit',
  cwd: process.cwd()
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});
