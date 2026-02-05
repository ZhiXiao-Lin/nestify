import { Test, TestingModule } from '@nestjs/testing';
import { GetOrderHandler } from './get-order.handler';
import { GetOrderQuery } from './get-order.query';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import { Quantity } from '../../../domain/value-objects/quantity.vo';
import { OrderNotFoundException } from '../../../domain/exceptions/order-not-found.exception';

describe('GetOrderHandler', () => {
    let handler: GetOrderHandler;
    let orderRepository: jest.Mocked<IOrderRepository>;

    beforeEach(async () => {
        const mockOrderRepository: Partial<IOrderRepository> = {
            save: jest.fn(),
            findById: jest.fn(),
            findByCustomerId: jest.fn(),
            delete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetOrderHandler,
                {
                    provide: ORDER_REPOSITORY,
                    useValue: mockOrderRepository,
                },
            ],
        }).compile();

        handler = module.get<GetOrderHandler>(GetOrderHandler);
        orderRepository = module.get(ORDER_REPOSITORY);
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    describe('execute', () => {
        it('should return order DTO for existing order', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(2),
                    unitPrice: Money.create(10),
                }),
                OrderItem.create({
                    id: 'item-2',
                    productId: 'product-2',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(20),
                }),
            ];
            const order = Order.create('customer-1', items);
            const query = new GetOrderQuery(order.id);

            orderRepository.findById.mockResolvedValue(order);

            const result = await handler.execute(query);

            expect(result).toBeDefined();
            expect(result.id).toBe(order.id);
            expect(result.customerId).toBe('customer-1');
            expect(result.items.length).toBe(2);
            expect(result.status).toBe('PENDING');
            expect(result.totalAmount).toBe(40);
        });

        it('should map order items correctly', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(3),
                    unitPrice: Money.create(15),
                }),
            ];
            const order = Order.create('customer-1', items);
            const query = new GetOrderQuery(order.id);

            orderRepository.findById.mockResolvedValue(order);

            const result = await handler.execute(query);

            expect(result.items[0].id).toBe('item-1');
            expect(result.items[0].productId).toBe('product-1');
            expect(result.items[0].quantity).toBe(3);
            expect(result.items[0].unitPrice).toBe(15);
            expect(result.items[0].totalPrice).toBe(45);
        });

        it('should include timestamps in response', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            const query = new GetOrderQuery(order.id);

            orderRepository.findById.mockResolvedValue(order);

            const result = await handler.execute(query);

            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw OrderNotFoundException when order not found', async () => {
            const query = new GetOrderQuery('non-existent-id');

            orderRepository.findById.mockResolvedValue(null);

            await expect(handler.execute(query)).rejects.toThrow(OrderNotFoundException);
            await expect(handler.execute(query)).rejects.toThrow('non-existent-id');
        });

        it('should handle confirmed order status', async () => {
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
            const query = new GetOrderQuery(order.id);

            orderRepository.findById.mockResolvedValue(order);

            const result = await handler.execute(query);

            expect(result.status).toBe('CONFIRMED');
        });

        it('should handle cancelled order status', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const order = Order.create('customer-1', items);
            order.cancel();
            const query = new GetOrderQuery(order.id);

            orderRepository.findById.mockResolvedValue(order);

            const result = await handler.execute(query);

            expect(result.status).toBe('CANCELLED');
        });
    });
});
