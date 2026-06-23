import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { corePackages } from './core-packages.mjs';

const rootDir = process.cwd();
const registry = process.env.PUBLISH_REGISTRY ?? 'https://registry.npmjs.org';
const dirtyWorktree = isWorktreeDirty();
const failures = [];
let dryRunCount = 0;
let skipCount = 0;

for (const corePackage of corePackages) {
    const packageDir = path.join(rootDir, corePackage.dir);
    const manifest = readPackageJson(packageDir);

    if (isAlreadyPublished(manifest.name, manifest.version)) {
        console.log(`Skipping ${manifest.name}@${manifest.version}; version already exists on ${registry}`);
        skipCount += 1;
        continue;
    }

    console.log(`\nDry-running npm publish for ${corePackage.name} from ${corePackage.dir}`);

    const result = spawnSync(
        'pnpm',
        ['publish', '--dry-run', '--ignore-scripts', '--access', 'public', '--registry', registry],
        {
            cwd: packageDir,
            env: {
                ...process.env,
                ...(dirtyWorktree ? { npm_config_git_checks: 'false' } : {}),
            },
            stdio: 'inherit',
        },
    );

    if (result.status !== 0) {
        failures.push(corePackage.name);
    } else {
        dryRunCount += 1;
    }
}

if (failures.length > 0) {
    console.error(`\nPublish dry-run failed for: ${failures.join(', ')}`);
    process.exit(1);
}

console.log(`\nDry-ran npm publish for ${dryRunCount} core packages; skipped ${skipCount} already-published versions.`);

function readPackageJson(packageDir) {
    return JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
}

function isAlreadyPublished(packageName, version) {
    const result = spawnSync('npm', ['view', `${packageName}@${version}`, 'version', '--registry', registry], {
        encoding: 'utf8',
    });

    return result.status === 0 && result.stdout.trim() === version;
}

function isWorktreeDirty() {
    const checks = [
        ['diff', '--quiet'],
        ['diff', '--cached', '--quiet'],
    ];

    for (const args of checks) {
        const result = spawnSync('git', args, { cwd: rootDir, stdio: 'ignore' });
        if (result.status !== 0) {
            return true;
        }
    }

    const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
        cwd: rootDir,
        encoding: 'utf8',
    });

    return untracked.status !== 0 || untracked.stdout.trim().length > 0;
}
