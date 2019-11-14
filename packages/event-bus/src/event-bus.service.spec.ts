import { Test, TestingModule } from '@nestjs/testing';
import { Listener, Subscriber } from './event-bus.decorators';
import { EventBusModule } from './event-bus.module';
import { EventBusService } from './event-bus.service';

@Subscriber()
class MySubscriber {
    @Listener({ event: 'test' })
    all() {
        console.log('test');
    }
}

describe('EventBus Service', () => {
    let module: TestingModule;
    let service: EventBusService;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [EventBusModule.register()],
            providers: [MySubscriber]
        }).compile();

        service = module.get(EventBusService);
    });

    it('should emit the event', async () => {
        const resut = await service.emit('test');

        expect(resut).toEqual(true);
    });
});
