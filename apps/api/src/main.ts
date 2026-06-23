import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DomainExceptionFilter, HttpExceptionFilter, LoggingInterceptor } from '@a3s-lab/http';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.useGlobalFilters(new HttpExceptionFilter(), new DomainExceptionFilter());

    app.useGlobalInterceptors(new LoggingInterceptor());

    const config = new DocumentBuilder()
        .setTitle('Nestify Sample API')
        .setDescription('Sample backend API built with Nestify DDD framework packages')
        .setVersion('1.0')
        .addTag('orders')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.APP_PORT || 3000;
    await app.listen(port);

    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
