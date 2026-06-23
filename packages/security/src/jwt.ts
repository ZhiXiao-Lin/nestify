export interface JwtPayload {
    sub: string;
    email?: string;
    organizationId?: string | null;
    roles?: string[];
    permissions?: string[];
    type?: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}
