import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, '.artifacts/core-packages');

const corePackages = [
    { name: '@a3s-lab/ddd', dir: 'packages/ddd' },
    { name: '@a3s-lab/http', dir: 'packages/http' },
    { name: '@a3s-lab/security', dir: 'packages/security' },
    { name: '@a3s-lab/observability', dir: 'packages/observability' },
    { name: '@a3s-lab/resilience', dir: 'packages/resilience' },
    { name: '@a3s-lab/clickhouse', dir: 'packages/clickhouse' },
    { name: '@a3s-lab/migrations', dir: 'packages/migrations' },
];

const requiredFiles = ['README.md', 'dist/**/*.js', 'dist/**/*.d.ts', 'dist/**/*.js.map'];
const deniedFiles = ['!dist/**/__tests__/**', '!dist/**/*.spec.*', '!dist/**/*.tsbuildinfo'];
const forbiddenTarEntries = [/\/src\//, /__tests__/, /\.spec\./, /tsbuildinfo$/];
const failures = [];

for (const corePackage of corePackages) {
    verifyPackage(corePackage);
}

if (failures.length > 0) {
    console.error('Core package verification failed:');
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log(`Verified ${corePackages.length} core package manifests and tarballs.`);

function verifyPackage(corePackage) {
    const packageDir = path.join(rootDir, corePackage.dir);
    const packageJsonPath = path.join(packageDir, 'package.json');
    const manifest = readJson(packageJsonPath);

    expect(manifest.name === corePackage.name, `${corePackage.dir}: package name must be ${corePackage.name}`);
    expect(manifest.main === './dist/index.js', `${corePackage.name}: main must point to ./dist/index.js`);
    expect(manifest.types === './dist/index.d.ts', `${corePackage.name}: types must point to ./dist/index.d.ts`);
    expect(
        manifest.exports?.['.']?.import === './dist/index.js',
        `${corePackage.name}: exports["."].import is missing`,
    );
    expect(
        manifest.exports?.['.']?.require === './dist/index.js',
        `${corePackage.name}: exports["."].require is missing`,
    );
    expect(
        manifest.exports?.['.']?.types === './dist/index.d.ts',
        `${corePackage.name}: exports["."].types is missing`,
    );
    expect(manifest.sideEffects === false, `${corePackage.name}: sideEffects should be false`);

    for (const file of [...requiredFiles, ...deniedFiles]) {
        expect(manifest.files?.includes(file), `${corePackage.name}: files must include ${file}`);
    }

    const readmePath = path.join(packageDir, 'README.md');
    expect(existsSync(readmePath), `${corePackage.name}: README.md is missing`);
    if (existsSync(readmePath)) {
        const readme = readFileSync(readmePath, 'utf8');
        expect(readme.includes(corePackage.name), `${corePackage.name}: README.md should mention the package name`);
    }

    expect(existsSync(path.join(packageDir, 'dist/index.js')), `${corePackage.name}: dist/index.js is missing`);
    expect(existsSync(path.join(packageDir, 'dist/index.d.ts')), `${corePackage.name}: dist/index.d.ts is missing`);

    verifyTarball(corePackage, manifest);
}

function verifyTarball(corePackage, manifest) {
    if (!existsSync(artifactsDir)) {
        failures.push('Missing .artifacts/core-packages; run pnpm pack:core before verification');
        return;
    }

    const expectedTarball = `${corePackage.name.replace(/^@/, '').replace(/\//g, '-')}-${manifest.version}.tgz`;
    const tarballPath = path.join(artifactsDir, expectedTarball);
    expect(existsSync(tarballPath), `${corePackage.name}: expected tarball ${expectedTarball} is missing`);
    if (!existsSync(tarballPath)) {
        return;
    }

    const entries = execFileSync('tar', ['-tf', tarballPath], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const entrySet = new Set(entries);

    for (const entry of [
        'package/package.json',
        'package/README.md',
        'package/dist/index.js',
        'package/dist/index.d.ts',
    ]) {
        expect(entrySet.has(entry), `${corePackage.name}: tarball must include ${entry}`);
    }

    for (const entry of entries) {
        for (const pattern of forbiddenTarEntries) {
            expect(!pattern.test(entry), `${corePackage.name}: tarball includes forbidden entry ${entry}`);
        }
    }

    const packedManifest = JSON.parse(
        execFileSync('tar', ['-xOf', tarballPath, 'package/package.json'], { encoding: 'utf8' }),
    );
    for (const [dependencyName, dependencyVersion] of Object.entries(packedManifest.dependencies ?? {})) {
        expect(
            !String(dependencyVersion).startsWith('workspace:'),
            `${corePackage.name}: packed dependency ${dependencyName} still uses workspace protocol`,
        );
    }
}

function readJson(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

function expect(condition, message) {
    if (!condition) {
        failures.push(message);
    }
}
