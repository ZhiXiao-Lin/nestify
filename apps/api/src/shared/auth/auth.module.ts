// ============================================================================
// Auth Module - Authentication and Authorization
// ============================================================================

import { Module, Global } from '@nestjs/common';
import { JwtService } from './jwt/jwt.service';
import { RbacService } from './rbac/rbac.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Global()
@Module({
    providers: [
        JwtService,
        RbacService,
        JwtAuthGuard,
        RolesGuard,
        PermissionsGuard,
    ],
    exports: [
        JwtService,
        RbacService,
        JwtAuthGuard,
        RolesGuard,
        PermissionsGuard,
    ],
})
export class AuthModule {}
