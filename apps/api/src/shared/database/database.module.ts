import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KyselyModule, createKyselyLogger } from '@a3s-lab/kysely';
import { recordSql } from '@a3s-lab/observability';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';

@Global()
@Module({
    imports: [
        KyselyModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                config: {
                    dialect: new PostgresDialect({
                        pool: new Pool({
                            host: configService.get('DB_HOST', 'localhost'),
                            port: configService.get('DB_PORT', 5432),
                            user: configService.get('DB_USERNAME', 'postgres'),
                            password: configService.get('DB_PASSWORD', 'postgres'),
                            database: configService.get('DB_DATABASE', 'nestify'),
                            max: 10,
                        }),
                    }),
                    log: createKyselyLogger({
                        consoleOutput: configService.get('NODE_ENV') === 'development',
                        onQuery: recordSql,
                    }),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [KyselyModule],
})
export class DatabaseModule { }
