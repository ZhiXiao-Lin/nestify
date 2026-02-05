import { createKyselyLogger } from '../kysely.logger';

describe('KyselyLogger', () => {
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('createKyselyLogger', () => {
        it('should return a function', () => {
            const logger = createKyselyLogger();
            expect(typeof logger).toBe('function');
        });

        it('should log query events', () => {
            const logger = createKyselyLogger();
            // Use any to bypass strict type checking for test purposes
            const event: any = {
                level: 'query',
                queryDurationMillis: 5.5,
                query: {
                    sql: 'SELECT * FROM users WHERE id = $1',
                    parameters: ['123'],
                },
            };

            logger(event);

            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log error events', () => {
            const logger = createKyselyLogger();
            const event: any = {
                level: 'error',
                queryDurationMillis: 10.2,
                query: {
                    sql: 'SELECT * FROM invalid_table',
                    parameters: [],
                },
                error: new Error('Table not found'),
            };

            logger(event);

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should handle queries without parameters', () => {
            const logger = createKyselyLogger();
            const event: any = {
                level: 'query',
                queryDurationMillis: 1.0,
                query: {
                    sql: 'SELECT COUNT(*) FROM users',
                    parameters: [],
                },
            };

            expect(() => logger(event)).not.toThrow();
        });

        it('should handle various parameter types', () => {
            const logger = createKyselyLogger();
            const event: any = {
                level: 'query',
                queryDurationMillis: 2.5,
                query: {
                    sql: 'INSERT INTO users (name, age, active, created_at) VALUES ($1, $2, $3, $4)',
                    parameters: ['John', 30, true, new Date('2024-01-01')],
                },
            };

            expect(() => logger(event)).not.toThrow();
        });

        it('should handle null and undefined parameters', () => {
            const logger = createKyselyLogger();
            const event: any = {
                level: 'query',
                queryDurationMillis: 1.5,
                query: {
                    sql: 'UPDATE users SET name = $1, email = $2 WHERE id = $3',
                    parameters: [null, undefined, '123'],
                },
            };

            expect(() => logger(event)).not.toThrow();
        });
    });
});
