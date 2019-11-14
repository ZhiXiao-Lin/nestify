import { Test, TestingModule } from '@nestjs/testing';
import { Listener, Subscriber } from './event-bus.decorators';
import { EventBusModule } from './event-bus.module';
import { EventBusService } from './event-bus.service';

@Subscriber()
class MySubscriber {
    @Listener({ event: 'test' })
    all(data: any) {
        console.log('test', data);
    }
}

describe('EventBus Service', () => {
    let module: TestingModule;
    let service: EventBusService;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [EventBusModule.register({
                middleware: [
                    async (data, next) => {
                        data.value = 1;

                        await next();

                        data.value = 5;
                    },
                    async (data, next) => {
                        data.value = 2;

                        await next();

                        data.value = 4;
                    },
                    async (data, next) => {
                        data.value = 3;
                    },
                ]
            })],
            providers: [MySubscriber]
        }).compile();

        service = module.get(EventBusService);
    });

    it('should emit the event', async () => {
        const resut = await service.emit('test', { value: 1 });
        expect(resut).toEqual(true);
    });
});
