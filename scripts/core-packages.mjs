export const corePackages = [
    { name: '@a3s-lab/ddd', dir: 'packages/ddd' },
    { name: '@a3s-lab/cqrs', dir: 'packages/cqrs' },
    { name: '@a3s-lab/http', dir: 'packages/http' },
    { name: '@a3s-lab/security', dir: 'packages/security' },
    { name: '@a3s-lab/observability', dir: 'packages/observability' },
    { name: '@a3s-lab/logger', dir: 'packages/logger' },
    { name: '@a3s-lab/kysely', dir: 'packages/kysely' },
    { name: '@a3s-lab/redisson', dir: 'packages/redisson' },
    { name: '@a3s-lab/resilience', dir: 'packages/resilience' },
    { name: '@a3s-lab/bullmq', dir: 'packages/bullmq' },
    { name: '@a3s-lab/nats', dir: 'packages/nats' },
    { name: '@a3s-lab/rustfs', dir: 'packages/rustfs' },
    { name: '@a3s-lab/etcd', dir: 'packages/etcd' },
    { name: '@a3s-lab/clickhouse', dir: 'packages/clickhouse' },
    { name: '@a3s-lab/migrations', dir: 'packages/migrations' },
    { name: '@a3s-lab/files', dir: 'packages/files' },
    { name: '@a3s-lab/ai', dir: 'packages/ai' },
    { name: '@a3s-lab/sandbox', dir: 'packages/sandbox' },
];

export function getCorePackageFilters() {
    return corePackages.flatMap(corePackage => ['--filter', corePackage.name]);
}
