import * as fs from 'fs';
import { resolve } from 'path';
import * as util from 'util';
import * as Fastify from 'fastify';
import * as Nextjs from 'next';
import * as ServeStatic from 'serve-static';
import * as FileUpload from 'fastify-file-upload';
import * as Helmet from 'fastify-helmet';
import * as RateLimit from 'fastify-rate-limit';
import * as Cookie from 'fastify-cookie';
import * as Session from 'fastify-session';
import * as ConnectRedis from 'connect-redis';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Seed } from './seed';
import { config } from './config';
import { ExceptionsFilter } from './common/aspects/exceptions.filter';
import { influx } from './common/lib/influx';
import { io } from './common/lib/io';
import { mq } from './common/lib/mq';
import { wf } from './common/lib/wf';
import { Logger } from './common/lib/logger';

declare const module: any;

const readFileAsync = util.promisify(fs.readFile);
const RedisStore = ConnectRedis(Session);

async function bootstrap() {
    const dev = process.env.NODE_ENV !== 'production';

    // Nextjs
    const nextjs = Nextjs({ dev });
    await nextjs.prepare();

    // Fastify
    const fastify = Fastify();

    fastify.register(Helmet, config.helmet);
    fastify.register(RateLimit, config.rateLimit);
    fastify.register(FileUpload, config.fileUpload);
    fastify.register(Cookie);
    fastify.register(Session, {
        store: new RedisStore(config.redis),
        ...config.session
    });

    fastify.addHook('onRequest', (req, reply, next) => {
        reply['render'] = async (path, data = {}) => {
            req.query.data = data;
            await nextjs.render(req.raw, reply.res, path, req.query, {});
        };
        next();
    });

    fastify.use('/static', ServeStatic(resolve('static')));
    fastify.use('/admin', ServeStatic(resolve('../admin/dist')));

    fastify.get('/_next/*', async (req, reply) => await nextjs.handleRequest(req.req, reply.res));
    fastify.get('/admin/*', async (req, reply) => {
        const content = await readFileAsync(resolve('../admin/dist/index.html'));
        reply
            .code(200)
            .type('text/html')
            .send(content);
    });

    // InfluxDB
    const dbNames = await influx.getDatabaseNames();
    if (!dbNames.includes(config.influx.database)) {
        await influx.createDatabase(config.influx.database);
    }

    // Nestjs
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(fastify),
        {
            logger: false
        }
    );

    if (!!process.env.DB_INIT) {
        try {
            Logger.log('Database initializing');

            const seed = app.get(Seed);
            await seed.start();

            Logger.log('Database initialized');
        } catch (err) {
            Logger.error(err);
        } finally {
            process.exit(0);
        }
    }

    const options = new DocumentBuilder()
        .setTitle('Nestify')
        .setDescription('The Nestify API Documents')
        .setVersion('0.0.1')
        .addTag('Nestify')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);

    app.enableCors();
    app.useGlobalFilters(new ExceptionsFilter());

    await mq.init();
    await wf.init();

    io.server.listen(app.getHttpServer());
    await io.init();

    await app.listen(config.port, config.hostName, () => {
        Logger.log(`Server run at port ${config.port}`);
    });

    if (module.hot) {
        module.hot.accept();
        module.hot.dispose(() => app.close());
    }
}

bootstrap();
