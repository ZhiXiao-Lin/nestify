import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { corePackages } from './core-packages.mjs';

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, '.artifacts/core-packages');

const requiredFiles = ['README.md', 'dist/**/*.js', 'dist/**/*.d.ts', 'dist/**/*.js.map'];
const deniedFiles = ['!dist/**/__tests__/**', '!dist/**/*.spec.*', '!dist/**/*.tsbuildinfo'];
const requiredReadmeSections = ['## Install', '## Use', '## Exports', '## Notes'];
const forbiddenTarEntries = [/\/src\//, /__tests__/, /\.spec\./, /tsbuildinfo$/];
const failures = [];

verifyCorePackageList();

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

function verifyCorePackageList() {
    const coreNames = corePackages.map(corePackage => corePackage.name);
    const coreDirs = corePackages.map(corePackage => corePackage.dir);
    const duplicateNames = findDuplicates(coreNames);
    const duplicateDirs = findDuplicates(coreDirs);

    expect(duplicateNames.length === 0, `corePackages contains duplicate package names: ${duplicateNames.join(', ')}`);
    expect(duplicateDirs.length === 0, `corePackages contains duplicate package dirs: ${duplicateDirs.join(', ')}`);

    const packageDirs = readdirSync(path.join(rootDir, 'packages'), { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => `packages/${entry.name}`)
        .filter(dir => existsSync(path.join(rootDir, dir, 'package.json')))
        .sort();

    const missingFromCore = packageDirs.filter(dir => !coreDirs.includes(dir));
    const staleCoreDirs = coreDirs.filter(dir => !packageDirs.includes(dir));

    expect(
        missingFromCore.length === 0,
        `corePackages must include every packages/* package; missing ${missingFromCore.join(', ')}`,
    );
    expect(staleCoreDirs.length === 0, `corePackages includes missing package dirs: ${staleCoreDirs.join(', ')}`);

    const coreIndexByName = new Map(corePackages.map((corePackage, index) => [corePackage.name, index]));
    for (const [packageIndex, corePackage] of corePackages.entries()) {
        const manifest = readJson(path.join(rootDir, corePackage.dir, 'package.json'));
        const dependencies = Object.keys(manifest.dependencies ?? {}).filter(dependencyName =>
            coreIndexByName.has(dependencyName),
        );

        for (const dependencyName of dependencies) {
            const dependencyIndex = coreIndexByName.get(dependencyName);
            expect(
                dependencyIndex < packageIndex,
                `${corePackage.name}: internal dependency ${dependencyName} must appear earlier in corePackages`,
            );
        }
    }
}

function verifyPackage(corePackage) {
    const packageDir = path.join(rootDir, corePackage.dir);
    const packageJsonPath = path.join(packageDir, 'package.json');
    const manifest = readJson(packageJsonPath);
    const expectedHomepage = `https://github.com/A3S-Lab/nestify/tree/main/${corePackage.dir}#readme`;

    expect(manifest.name === corePackage.name, `${corePackage.dir}: package name must be ${corePackage.name}`);
    expect(manifest.private !== true, `${corePackage.name}: core packages must be publishable`);
    expect(
        typeof manifest.description === 'string' && manifest.description.length > 0,
        `${corePackage.name}: description is required`,
    );
    expect(manifest.author === 'A3S Lab', `${corePackage.name}: author must be A3S Lab`);
    expect(manifest.license === 'MIT', `${corePackage.name}: license must be MIT`);
    expect(manifest.homepage === expectedHomepage, `${corePackage.name}: homepage must be ${expectedHomepage}`);
    expect(manifest.repository?.type === 'git', `${corePackage.name}: repository.type must be git`);
    expect(
        manifest.repository?.url === 'git+https://github.com/A3S-Lab/nestify.git',
        `${corePackage.name}: repository.url must point to the nestify repository`,
    );
    expect(
        manifest.repository?.directory === corePackage.dir,
        `${corePackage.name}: repository.directory must be ${corePackage.dir}`,
    );
    expect(
        manifest.bugs?.url === 'https://github.com/A3S-Lab/nestify/issues',
        `${corePackage.name}: bugs.url must point to the nestify issue tracker`,
    );
    expect(
        Array.isArray(manifest.keywords) && manifest.keywords.length > 0,
        `${corePackage.name}: keywords are required`,
    );
    expect(manifest.source === './src/index.ts', `${corePackage.name}: source must point to ./src/index.ts`);
    expect(manifest.main === './dist/index.js', `${corePackage.name}: main must point to ./dist/index.js`);
    expect(manifest.types === './dist/index.d.ts', `${corePackage.name}: types must point to ./dist/index.d.ts`);
    expect(manifest.publishConfig?.access === 'public', `${corePackage.name}: publishConfig.access must be public`);
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
        for (const section of requiredReadmeSections) {
            expect(readme.includes(section), `${corePackage.name}: README.md should include ${section}`);
        }
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

    const entries = execFileSync('tar', ['-tf', tarballPath], { encoding: 'utf8' })
        .trim()
        .split(/\r?\n/)
        .filter(Boolean);
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

function findDuplicates(values) {
    const seen = new Set();
    const duplicates = new Set();

    for (const value of values) {
        if (seen.has(value)) {
            duplicates.add(value);
        }
        seen.add(value);
    }

    return [...duplicates].sort();
}

function expect(condition, message) {
    if (!condition) {
        failures.push(message);
    }
}
