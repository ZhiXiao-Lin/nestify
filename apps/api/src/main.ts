import { createValidationPipe } from '@a3s-lab/http';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api');

    app.useGlobalPipes(createValidationPipe());

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
