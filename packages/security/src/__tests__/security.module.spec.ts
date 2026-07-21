import 'reflect-metadata';
import { Controller, Get, INestApplication, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthGuardDelegate, Public, SecurityModule } from '../index';

@Controller()
class TestController {
    @Get('private')
    privateRoute() {
        return { access: 'private' };
    }

    @Public()
    @Get('public')
    publicRoute() {
        return { access: 'public' };
    }
}

@Injectable()
class AllowAuthGuard implements AuthGuardDelegate {
    canActivate() {
        return true;
    }
}

describe('SecurityModule', () => {
    let app: INestApplication | undefined;

    afterEach(async () => {
        await app?.close();
        app = undefined;
    });

    it('installs a global fail-closed guard without exporting a missing delegate', async () => {
        app = await createApplication(SecurityModule.register());

        await request(app.getHttpServer()).get('/public').expect(200, { access: 'public' });
        await request(app.getHttpServer()).get('/private').expect(403);
    });

    it('delegates private routes when an authentication guard is configured', async () => {
        app = await createApplication(
            SecurityModule.register({
                authGuardDelegate: AllowAuthGuard,
            }),
        );

        await request(app.getHttpServer()).get('/private').expect(200, { access: 'private' });
    });

    it('supports explicit manual guard installation', async () => {
        app = await createApplication(SecurityModule.register({ installGlobally: false }));

        await request(app.getHttpServer()).get('/private').expect(200, { access: 'private' });
    });
});

async function createApplication(securityModule: ReturnType<typeof SecurityModule.register>) {
    const testingModule = await Test.createTestingModule({
        imports: [securityModule],
        controllers: [TestController],
    }).compile();
    const application = testingModule.createNestApplication();
    await application.init();
    return application;
}
