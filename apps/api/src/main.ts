import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/presentation/filters/http-exception.filter';
import { DomainExceptionFilter } from './shared/presentation/filters/domain-exception.filter';
import { LoggingInterceptor } from './shared/presentation/interceptors/logging.interceptor';

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
        .setTitle('NestJS DDD Template')
        .setDescription('Production-ready NestJS template with Domain-Driven Design')
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
