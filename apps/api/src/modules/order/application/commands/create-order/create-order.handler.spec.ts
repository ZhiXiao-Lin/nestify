import { Test, TestingModule } from '@nestjs/testing';
import { DOMAIN_EVENT_PUBLISHER, type IDomainEventPublisher } from '@a3s-lab/ddd';
import { CreateOrderHandler } from './create-order.handler';
import { CreateOrderCommand } from './create-order.command';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { Order } from '../../../domain/entities/order.entity';

describe('CreateOrderHandler', () => {
    let handler: CreateOrderHandler;
    let orderRepository: jest.Mocked<IOrderRepository>;
    let domainEventPublisher: jest.Mocked<IDomainEventPublisher>;

    beforeEach(async () => {
        const mockOrderRepository: Partial<IOrderRepository> = {
            save: jest.fn(),
            findById: jest.fn(),
            findByCustomerId: jest.fn(),
            delete: jest.fn(),
        };

        const mockDomainEventPublisher: Partial<IDomainEventPublisher> = {
            publish: jest.fn(),
            publishAll: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateOrderHandler,
                {
                    provide: ORDER_REPOSITORY,
                    useValue: mockOrderRepository,
                },
                {
                    provide: DOMAIN_EVENT_PUBLISHER,
                    useValue: mockDomainEventPublisher,
                },
            ],
        }).compile();

        handler = module.get<CreateOrderHandler>(CreateOrderHandler);
        orderRepository = module.get(ORDER_REPOSITORY);
        domainEventPublisher = module.get(DOMAIN_EVENT_PUBLISHER);
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    describe('execute', () => {
        it('should create order with valid command', async () => {
            const command = new CreateOrderCommand('customer-1', [
                { productId: 'product-1', quantity: 2, unitPrice: 10 },
                { productId: 'product-2', quantity: 1, unitPrice: 20 },
            ]);

            orderRepository.save.mockImplementation(async (order: Order) => order);

            const orderId = await handler.execute(command);

            expect(orderId).toBeDefined();
            expect(typeof orderId).toBe('string');
            expect(orderRepository.save).toHaveBeenCalledTimes(1);
        });

        it('should save order with correct properties', async () => {
            const command = new CreateOrderCommand('customer-1', [
                { productId: 'product-1', quantity: 2, unitPrice: 10 },
            ]);

            orderRepository.save.mockImplementation(async (order: Order) => order);

            await handler.execute(command);

            expect(orderRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    customerId: 'customer-1',
                }),
            );

            const savedOrder = orderRepository.save.mock.calls[0][0];
            expect(savedOrder.items.length).toBe(1);
            expect(savedOrder.items[0].productId).toBe('product-1');
            expect(savedOrder.items[0].quantity.value).toBe(2);
            expect(savedOrder.items[0].unitPrice.amount).toBe(10);
        });

        it('should publish domain events after saving', async () => {
            const command = new CreateOrderCommand('customer-1', [
                { productId: 'product-1', quantity: 1, unitPrice: 10 },
            ]);

            orderRepository.save.mockImplementation(async (order: Order) => order);

            await handler.execute(command);

            expect(domainEventPublisher.publishAll).toHaveBeenCalledTimes(1);
            expect(domainEventPublisher.publishAll).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        customerId: 'customer-1',
                    }),
                ]),
            );
        });

        it('should clear events after publishing', async () => {
            const command = new CreateOrderCommand('customer-1', [
                { productId: 'product-1', quantity: 1, unitPrice: 10 },
            ]);

            let savedOrder: Order;
            orderRepository.save.mockImplementation(async (order: Order) => {
                savedOrder = order;
                return order;
            });

            await handler.execute(command);

            // Events should be cleared after publishing
            expect(savedOrder!.domainEvents.length).toBe(0);
        });

        it('should create order with multiple items', async () => {
            const command = new CreateOrderCommand('customer-1', [
                { productId: 'product-1', quantity: 2, unitPrice: 10 },
                { productId: 'product-2', quantity: 1, unitPrice: 20 },
                { productId: 'product-3', quantity: 3, unitPrice: 5 },
            ]);

            orderRepository.save.mockImplementation(async (order: Order) => order);

            await handler.execute(command);

            const savedOrder = orderRepository.save.mock.calls[0][0];
            expect(savedOrder.items.length).toBe(3);
        });

        it('should handle repository errors', async () => {
            const command = new CreateOrderCommand('customer-1', [
                { productId: 'product-1', quantity: 1, unitPrice: 10 },
            ]);

            orderRepository.save.mockRejectedValue(new Error('Database error'));

            await expect(handler.execute(command)).rejects.toThrow('Database error');
        });
    });
});
