import * as Fastify from 'fastify';
import * as Nextjs from 'next';
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

const MODULE_NAME = 'Main';
declare const module: any;

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
	fastify.get('/_next/*', async (req, reply) => await nextjs.handleRequest(req.req, reply.res));

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

	app.useStaticAssets({ root: resolve(config.static.root), prefix: config.static.prefix });

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
