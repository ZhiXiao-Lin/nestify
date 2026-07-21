import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { corePackages } from './core-packages.mjs';

const rootDir = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const unknownArgs = args.filter(arg => arg !== '--dry-run');

if (unknownArgs.length > 0) {
    console.error(`Usage: node scripts/publish-core.mjs [--dry-run]; unknown args: ${unknownArgs.join(' ')}`);
    process.exit(1);
}

const registry = process.env.PUBLISH_REGISTRY ?? 'https://registry.npmjs.org';
const tag = process.env.PUBLISH_TAG ?? 'latest';
const otp = process.env.PUBLISH_OTP ?? process.env.NPM_CONFIG_OTP;
const artifactsDir = path.join(rootDir, '.artifacts/core-packages');
const failures = [];
let publishCount = 0;
let skipCount = 0;

for (const corePackage of corePackages) {
    const packageDir = path.join(rootDir, corePackage.dir);
    const manifest = readPackageJson(packageDir);
    const tarballPath = expectedTarballPath(manifest);

    if (!existsSync(tarballPath)) {
        console.error(`Missing verified tarball ${tarballPath}; run pnpm release:check first.`);
        failures.push(manifest.name);
        continue;
    }

    if (isAlreadyPublished(manifest.name, manifest.version)) {
        console.log(`Skipping ${manifest.name}@${manifest.version}; version already exists on ${registry}`);
        skipCount += 1;
        continue;
    }

    const publishArgs = [
        'publish',
        tarballPath,
        '--access',
        'public',
        '--tag',
        tag,
        '--registry',
        registry,
        '--no-git-checks',
    ];
    if (dryRun) {
        publishArgs.push('--dry-run');
    }
    if (otp) {
        publishArgs.push('--otp', otp);
    }

    console.log(`\n${dryRun ? 'Dry-running npm publish' : 'Publishing'} verified ${path.basename(tarballPath)}`);

    const result = spawnSync('pnpm', publishArgs, {
        cwd: rootDir,
        env: process.env,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });

    if (result.status !== 0) {
        failures.push(manifest.name);
    } else {
        publishCount += 1;
    }
}

if (failures.length > 0) {
    console.error(`\n${dryRun ? 'Publish dry-run' : 'Publish'} failed for: ${failures.join(', ')}`);
    process.exit(1);
}

console.log(
    `\n${dryRun ? 'Dry-ran npm publish' : 'Published'} for ${publishCount} core packages; skipped ${skipCount} already-published versions.`,
);

function readPackageJson(packageDir) {
    return JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
}

function expectedTarballPath(manifest) {
    const tarballName = `${manifest.name.replace(/^@/, '').replace(/\//g, '-')}-${manifest.version}.tgz`;
    return path.join(artifactsDir, tarballName);
}

function isAlreadyPublished(packageName, version) {
    const result = spawnSync('npm', ['view', `${packageName}@${version}`, 'version', '--registry', registry], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
    });

    return result.status === 0 && result.stdout.trim() === version;
}
