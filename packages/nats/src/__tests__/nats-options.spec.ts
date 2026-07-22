import { createNatsConnectionOptions } from '../nats-options';

describe('createNatsConnectionOptions', () => {
    it('builds stable defaults without mutating the caller input', () => {
        const input = {};

        expect(createNatsConnectionOptions(input)).toEqual({
            servers: ['nats://localhost:4222'],
            name: 'nestjs-nats',
            user: undefined,
            pass: undefined,
            token: undefined,
            maxReconnectAttempts: -1,
            reconnectTimeWait: 2_000,
            timeout: 10_000,
            pingInterval: 60_000,
            maxPingOut: 2,
        });
        expect(input).toEqual({});
    });

    it('deduplicates servers and maps nested credentials plus file-based TLS', () => {
        expect(
            createNatsConnectionOptions({
                servers: [' nats://one:4222 ', 'nats://one:4222', 'nats://two:4222'],
                auth: { token: 'secret-token' },
                tls: {
                    certFile: '/run/certs/client.pem',
                    keyFile: '/run/certs/client-key.pem',
                    caFile: '/run/certs/ca.pem',
                    rejectUnauthorized: true,
                },
                maxReconnectAttempts: 8,
                reconnectTimeWait: 500,
                timeout: 2_500,
                pingInterval: 20_000,
                maxPingOut: 3,
            }),
        ).toEqual({
            servers: ['nats://one:4222', 'nats://two:4222'],
            name: 'nestjs-nats',
            user: undefined,
            pass: undefined,
            token: 'secret-token',
            maxReconnectAttempts: 8,
            reconnectTimeWait: 500,
            timeout: 2_500,
            pingInterval: 20_000,
            maxPingOut: 3,
            tls: {
                certFile: '/run/certs/client.pem',
                keyFile: '/run/certs/client-key.pem',
                caFile: '/run/certs/ca.pem',
                rejectUnauthorized: true,
            },
        });
    });

    it('accepts matching direct and nested credentials', () => {
        expect(
            createNatsConnectionOptions({
                user: 'service',
                pass: 'password',
                auth: { user: 'service', pass: 'password' },
            }),
        ).toMatchObject({ user: 'service', pass: 'password' });
    });

    it.each([
        [null, 'module options must be an object'],
        [[], 'module options must be an object'],
        [{ servers: [] }, 'servers must contain at least one server'],
        [{ servers: [' '] }, 'servers[0] must be a non-empty string'],
        [{ name: '' }, 'connection name must be a non-empty string'],
        [{ auth: 'invalid' }, 'auth must be an object'],
        [{ tls: 'invalid' }, 'tls must be an object'],
        [{ jetstream: 'invalid' }, 'jetstream must be an object'],
        [{ user: 'first', auth: { user: 'second' }, pass: 'password' }, 'user is configured with conflicting values'],
        [{ user: 'service' }, 'username and password must be configured together'],
        [{ token: 'token', user: 'service', pass: 'password' }, 'mutually exclusive'],
        [{ maxReconnectAttempts: -2 }, 'maxReconnectAttempts must be -1 or a non-negative integer'],
        [{ reconnectTimeWait: -1 }, 'reconnectTimeWait must be a non-negative integer'],
        [{ timeout: 0 }, 'connection timeout must be a positive integer'],
        [{ pingInterval: 0 }, 'pingInterval must be a positive integer'],
        [{ maxPingOut: 0 }, 'maxPingOut must be a positive integer'],
        [{ shutdownTimeoutMs: 0 }, 'shutdownTimeoutMs must be a positive integer'],
        [{ requestTimeoutMs: 0 }, 'requestTimeoutMs must be a positive integer'],
        [{ drainOnShutdown: 'yes' }, 'drainOnShutdown must be a boolean'],
        [{ jetstream: { enabled: 'yes' } }, 'jetstream.enabled must be a boolean'],
        [{ jetstream: { domain: '' } }, 'JetStream domain must be a non-empty string'],
        [{ jetstream: { prefix: '' } }, 'JetStream API prefix must be a non-empty string'],
        [{ tls: { certFile: 'file', cert: 'inline', key: 'key' } }, 'tls.certFile and tls.cert are mutually exclusive'],
        [{ tls: { keyFile: 'file', key: 'inline', cert: 'cert' } }, 'tls.keyFile and tls.key are mutually exclusive'],
        [{ tls: { caFile: 'file', ca: 'inline' } }, 'tls.caFile and tls.ca are mutually exclusive'],
        [{ tls: { cert: 'certificate' } }, 'TLS client certificate and key must be configured together'],
        [{ tls: { handshakeFirst: 'yes' } }, 'tls.handshakeFirst must be a boolean'],
        [{ tls: { verify: 'yes' } }, 'tls.verify must be a boolean'],
        [{ tls: { rejectUnauthorized: 'yes' } }, 'tls.rejectUnauthorized must be a boolean'],
        [{ tls: { verify: true, rejectUnauthorized: false } }, 'tls.verify and tls.rejectUnauthorized must agree'],
    ])('rejects invalid input %#', (input, message) => {
        expect(() => createNatsConnectionOptions(input as any)).toThrow(message as string);
        try {
            createNatsConnectionOptions(input as any);
        } catch (error) {
            expect(error).toMatchObject({ code: 'NATS_CONFIGURATION_ERROR' });
        }
    });
});
