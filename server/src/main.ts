import * as fs from 'fs';
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
import { config } from './config';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Seed } from './seed';
import { ExceptionsFilter } from './common/aspects/exceptions.filter';

declare const module: any;

const MODULE_NAME = 'Main';
const readFileAsync = util.promisify(fs.readFile);

async function bootstrap() {
	const dev = process.env.NODE_ENV !== 'production';

	// Nextjs
	const nextjs = Nextjs({ dev });
	await nextjs.prepare();

	// Fastify
	const fastify = Fastify();

	fastify.register(Helmet, { hidePoweredBy: { setTo: 'C++ 12' } });

	fastify.register(RateLimit, {
		timeWindow: 1,
		max: 5
	});

	fastify.register(FileUpload, {
		createParentPath: true,
		limits: { fileSize: 50 * 1024 * 1024 }
	});

	fastify.register(Cookie);

	const RedisStore = ConnectRedis(Session);
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
		reply.code(200).type('text/html').send(content);
	});
	fastify.get('/ccc', (req, reply) => {
		req.session.test = 'ccc'
		reply
			.setCookie('foo', 'foo', {
				domain: 'example.com',
				path: '/'
			})
			.send({ sessionId: req.session.sessionId })
	});
	fastify.get('/sss', (req, reply) => {

		reply
			.send({ test: req.session.test, sessionId: req.session.sessionId })
	});

	// Nestjs
	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(fastify));

	if (!!process.env.DB_SYNC) {
		Logger.log('Database synchronizing ...', MODULE_NAME);
	}

	if (!!process.env.DB_INIT) {
		Logger.log('Database initializing ...', MODULE_NAME);

		const seed = app.get(Seed);
		await seed.start();

		Logger.log('Database initialized', MODULE_NAME);
	}

	if (!!process.env.DB_SYNC || !!process.env.DB_INIT) {
		process.exit(0);
	}

	const options = new DocumentBuilder()
		.setTitle('Nestify')
		.setDescription('The Nestify API Documents')
		.setVersion('1.0')
		.addTag('Nestify')
		.addBearerAuth()
		.build();
	const document = SwaggerModule.createDocument(app, options);
	SwaggerModule.setup('docs', app, document);

	app.enableCors();

	app.useGlobalFilters(new ExceptionsFilter());


	await app.listen(config.port, config.hostName, () => {
		Logger.log(config, MODULE_NAME);
	});

	if (module.hot) {
		module.hot.accept();
		module.hot.dispose(() => app.close());
	}
}
bootstrap();
