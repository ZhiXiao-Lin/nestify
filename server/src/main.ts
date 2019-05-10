import * as fs from 'fs';
import * as util from 'util';
import * as Fastify from 'fastify';
import * as Nextjs from 'next';
import * as ServeStatic from 'serve-static';
import * as FileUpload from 'fastify-file-upload';
import { config } from './config';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Seed } from './seed';
import { HttpExceptionFilter } from './common/aspects/http-exception.filter';

declare const module: any;

const MODULE_NAME = 'Main';
const readFileAsync = util.promisify(fs.readFile);

async function bootstrap() {
	// Nextjs
	const nextjs = Nextjs({ dev: process.env.NODE_ENV !== 'production' });
	await nextjs.prepare();

	// Fastify
	const fastify = Fastify();

	fastify.register(FileUpload, {
		createParentPath: true,
		limits: { fileSize: 50 * 1024 * 1024 }
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

	app.useGlobalFilters(new HttpExceptionFilter());
	app.enableCors();

	await app.listen(config.port, config.hostName, () => {
		Logger.log(config, MODULE_NAME);
	});

	if (module.hot) {
		module.hot.accept();
		module.hot.dispose(() => app.close());
	}
}
bootstrap();
