import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { getCorePackageFilters } from './core-packages.mjs';

const rootDir = process.cwd();
const [command, ...args] = process.argv.slice(2);

if (!command) {
    console.error('Usage: node scripts/run-core-packages.mjs <build|test|pack> [...args]');
    process.exit(1);
}

const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const commandArgs = [...getCorePackageFilters(), command, ...args];

if (command === 'pack' && !args.includes('--pack-destination')) {
    const artifactsDir = path.join(rootDir, '.artifacts/core-packages');
    rmSync(artifactsDir, { recursive: true, force: true });
    mkdirSync(artifactsDir, { recursive: true });
    commandArgs.push('--pack-destination', artifactsDir);
}

execFileSync(pnpmBin, commandArgs, {
    cwd: rootDir,
    stdio: 'inherit',
});
