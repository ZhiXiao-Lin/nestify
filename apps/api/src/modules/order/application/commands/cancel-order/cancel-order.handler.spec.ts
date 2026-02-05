import { Test, TestingModule } from '@nestjs/testing';
import { CancelOrderHandler } from './cancel-order.handler';
import { CancelOrderCommand } from './cancel-order.command';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { IEventBus, EVENT_BUS } from '@/shared/infrastructure/messaging/event-bus.interface';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import { Quantity } from '../../../domain/value-objects/quantity.vo';
import { OrderNotFoundException } from '../../../domain/exceptions/order-not-found.exception';
import { InvalidOrderStateException } from '../../../domain/exceptions/invalid-order-state.exception';

describe('CancelOrderHandler', () => {
    let handler: CancelOrderHandler;
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
                CancelOrderHandler,
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

        handler = module.get<CancelOrderHandler>(CancelOrderHandler);
        orderRepository = module.get(ORDER_REPOSITORY);
        eventBus = module.get(EVENT_BUS);
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    describe('execute', () => {
        it('should cancel existing pending order', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            const command = new CancelOrderCommand(order.id);

            orderRepository.findById.mockResolvedValue(order);
            orderRepository.save.mockImplementation(async (o: Order) => o);

            await handler.execute(command);

            expect(orderRepository.findById).toHaveBeenCalledWith(order.id);
            expect(order.status.isCancelled()).toBe(true);
            expect(orderRepository.save).toHaveBeenCalledWith(order);
        });

        it('should cancel confirmed order', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            order.confirm();
            order.clearEvents();
            const command = new CancelOrderCommand(order.id);

            orderRepository.findById.mockResolvedValue(order);
            orderRepository.save.mockImplementation(async (o: Order) => o);

            await handler.execute(command);

            expect(order.status.isCancelled()).toBe(true);
        });

        it('should publish OrderCancelledEvent', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            const command = new CancelOrderCommand(order.id);

            orderRepository.findById.mockResolvedValue(order);
            orderRepository.save.mockImplementation(async (o: Order) => o);

            await handler.execute(command);

            expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
        });

        it('should throw OrderNotFoundException when order not found', async () => {
            const command = new CancelOrderCommand('non-existent-id');

            orderRepository.findById.mockResolvedValue(null);

            await expect(handler.execute(command)).rejects.toThrow(OrderNotFoundException);
        });

        it('should throw InvalidOrderStateException when order is already cancelled', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            order.cancel(); // Already cancelled
            const command = new CancelOrderCommand(order.id);

            orderRepository.findById.mockResolvedValue(order);

            await expect(handler.execute(command)).rejects.toThrow(InvalidOrderStateException);
        });
    });
});
