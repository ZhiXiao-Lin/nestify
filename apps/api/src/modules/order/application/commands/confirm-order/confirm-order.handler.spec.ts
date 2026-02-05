import { Test, TestingModule } from '@nestjs/testing';
import { ConfirmOrderHandler } from './confirm-order.handler';
import { ConfirmOrderCommand } from './confirm-order.command';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { IEventBus, EVENT_BUS } from '@/shared/infrastructure/messaging/event-bus.interface';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import { Quantity } from '../../../domain/value-objects/quantity.vo';
import { OrderNotFoundException } from '../../../domain/exceptions/order-not-found.exception';
import { InvalidOrderStateException } from '../../../domain/exceptions/invalid-order-state.exception';

describe('ConfirmOrderHandler', () => {
    let handler: ConfirmOrderHandler;
    let orderRepository: jest.Mocked<IOrderRepository>;
    let eventBus: jest.Mocked<IEventBus>;

    beforeEach(async () => {
        const mockOrderRepository: Partial<IOrderRepository> = {
            save: jest.fn(),
            findById: jest.fn(),
            findByCustomerId: jest.fn(),
            delete: jest.fn(),
        };

        const mockEventBus: Partial<IEventBus> = {
            publish: jest.fn(),
            publishAll: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfirmOrderHandler,
                {
                    provide: ORDER_REPOSITORY,
                    useValue: mockOrderRepository,
                },
                {
                    provide: EVENT_BUS,
                    useValue: mockEventBus,
                },
            ],
        }).compile();

        handler = module.get<ConfirmOrderHandler>(ConfirmOrderHandler);
        orderRepository = module.get(ORDER_REPOSITORY);
        eventBus = module.get(EVENT_BUS);
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    describe('execute', () => {
        it('should confirm existing pending order', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            const command = new ConfirmOrderCommand(order.id);

            orderRepository.findById.mockResolvedValue(order);
            orderRepository.save.mockImplementation(async (o: Order) => o);

            await handler.execute(command);

            expect(orderRepository.findById).toHaveBeenCalledWith(order.id);
            expect(order.status.isConfirmed()).toBe(true);
            expect(orderRepository.save).toHaveBeenCalledWith(order);
        });

        it('should publish OrderConfirmedEvent', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            const command = new ConfirmOrderCommand(order.id);

            orderRepository.findById.mockResolvedValue(order);
            orderRepository.save.mockImplementation(async (o: Order) => o);

            await handler.execute(command);

            expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
            const publishedEvents = eventBus.publishAll.mock.calls[0][0];
            expect(publishedEvents.length).toBeGreaterThan(0);
        });

        it('should throw OrderNotFoundException when order not found', async () => {
            const command = new ConfirmOrderCommand('non-existent-id');

            orderRepository.findById.mockResolvedValue(null);

            await expect(handler.execute(command)).rejects.toThrow(OrderNotFoundException);
            await expect(handler.execute(command)).rejects.toThrow('non-existent-id');
        });

        it('should throw InvalidOrderStateException when order is not pending', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            order.confirm(); // Already confirmed
            const command = new ConfirmOrderCommand(order.id);

            orderRepository.findById.mockResolvedValue(order);

            await expect(handler.execute(command)).rejects.toThrow(InvalidOrderStateException);
        });

        it('should not save order if confirmation fails', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            order.confirm(); // Already confirmed
            const command = new ConfirmOrderCommand(order.id);

            orderRepository.findById.mockResolvedValue(order);

            await expect(handler.execute(command)).rejects.toThrow();
            expect(orderRepository.save).not.toHaveBeenCalled();
        });
    });
});
