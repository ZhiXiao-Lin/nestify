import * as nodePath from 'node:path';

export class PathSecurityValidator {
    static hasPathTraversal(pathStr: string): boolean {
        return pathStr.split(/[\\/]+/).some(part => part === '..');
    }

    static normalizePath(pathStr: string): string {
        const normalized = pathStr.replace(/\\/g, '/').replace(/\/+$/, '');
        const parts = normalized.split('/');
        const resolved: string[] = [];
        for (const part of parts) {
            if (part === '..') {
                resolved.pop();
            } else if (part !== '.' && part !== '') {
                resolved.push(part);
            }
        }
        return `/${resolved.join('/')}`;
    }

    static isWithinRoot(pathStr: string, root: string): boolean {
        const resolvedPath = nodePath.resolve(pathStr);
        const resolvedRoot = nodePath.resolve(root);
        const relative = nodePath.relative(resolvedRoot, resolvedPath);
        return (
            relative === '' ||
            (!relative.startsWith(`..${nodePath.sep}`) && relative !== '..' && !nodePath.isAbsolute(relative))
        );
    }

    static pathStartsWith(pathStr: string, prefix: string): boolean {
        const normalizedPath = this.normalizePath(pathStr);
        const normalizedPrefix = this.normalizePath(prefix);
        return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
    }

    static resolveAndValidate(baseRoot: string, relativePath: string): string {
        const resolvedRoot = nodePath.resolve(baseRoot);
        const sanitizedPath = this.sanitizePath(relativePath).replace(/^[\\/]+/, '');
        const absolutePath = nodePath.resolve(resolvedRoot, sanitizedPath);
        if (!this.isWithinRoot(absolutePath, resolvedRoot)) {
            throw new Error('Invalid path: path traversal detected');
        }
        return absolutePath;
    }

    static validatePathAccess(
        pathStr: string,
        options: { blockedPaths?: string[]; allowedPaths?: string[] } = {},
    ): { valid: boolean; violations: string[] } {
        const violations: string[] = [];
        const { blockedPaths = [], allowedPaths = [] } = options;

        if (this.hasPathTraversal(pathStr)) {
            violations.push('Path traversal detected');
        }

        const normalizedPath = this.normalizePath(pathStr.startsWith('/') ? pathStr : `/${pathStr}`);
        for (const blockedPath of blockedPaths) {
            if (this.pathStartsWith(normalizedPath, blockedPath)) {
                violations.push(`Access to blocked path: ${blockedPath}`);
            }
        }

        if (
            allowedPaths.length > 0 &&
            !allowedPaths.some(allowedPath => this.pathStartsWith(normalizedPath, allowedPath))
        ) {
            violations.push('Path not in allowed list');
        }

        return { valid: violations.length === 0, violations };
    }

    static sanitizePath(pathStr: string): string {
        return pathStr
            .replace(/\0/g, '')
            .replace(/^(\.\.(\/|\\|$))+/, '')
            .replace(/[\r\n]/g, '');
    }
}
