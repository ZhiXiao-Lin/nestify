export interface JwtPayload {
    sub: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    type?: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}
