import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiResponseModule } from '@a3s-lab/http';
import request = require('supertest');

@Controller('framework-probe')
class FrameworkProbeController {
    @Get()
    probe(): { healthy: boolean } {
        return { healthy: true };
    }
}

@Module({
    imports: [ApiResponseModule],
    controllers: [FrameworkProbeController],
})
class FrameworkProbeModule {}

describe('Nest and Express integration', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [FrameworkProbeModule],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('serves a wrapped response through the Express adapter', async () => {
        const response = await request(app.getHttpServer()).get('/framework-probe').expect(200);

        expect(app.getHttpAdapter().getType()).toBe('express');
        expect(response.headers['x-request-id']).toEqual(expect.any(String));
        expect(response.body).toMatchObject({
            code: 200,
            status: 'SUCCESS',
            message: 'Success',
            data: {
                healthy: true,
            },
            requestId: response.headers['x-request-id'],
        });
        expect(response.body.timestamp).toEqual(expect.any(String));
    });
});
