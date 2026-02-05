import { Test, TestingModule } from '@nestjs/testing';
import { ListOrdersHandler } from './list-orders.handler';
import { ListOrdersQuery } from './list-orders.query';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import { Quantity } from '../../../domain/value-objects/quantity.vo';

describe('ListOrdersHandler', () => {
    let handler: ListOrdersHandler;
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
                ListOrdersHandler,
                {
                    provide: ORDER_REPOSITORY,
                    useValue: mockOrderRepository,
                },
            ],
        }).compile();

        handler = module.get<ListOrdersHandler>(ListOrdersHandler);
        orderRepository = module.get(ORDER_REPOSITORY);
    });

    it('should be defined', () => {
        expect(handler).toBeDefined();
    });

    describe('execute', () => {
        it('should return list of orders for customer', async () => {
            const items1 = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const items2 = [
                OrderItem.create({
                    id: 'item-2',
                    productId: 'product-2',
                    quantity: Quantity.create(2),
                    unitPrice: Money.create(20),
                }),
            ];

            const order1 = Order.create('customer-1', items1);
            const order2 = Order.create('customer-1', items2);

            const query = new ListOrdersQuery('customer-1');

            orderRepository.findByCustomerId.mockResolvedValue([order1, order2]);

            const result = await handler.execute(query);

            expect(result.orders.length).toBe(2);
            expect(result.total).toBe(2);
            expect(result.orders[0].customerId).toBe('customer-1');
            expect(result.orders[1].customerId).toBe('customer-1');
        });

        it('should return empty list when no orders found', async () => {
            const query = new ListOrdersQuery('customer-1');

            orderRepository.findByCustomerId.mockResolvedValue([]);

            const result = await handler.execute(query);

            expect(result.orders.length).toBe(0);
            expect(result.total).toBe(0);
        });

        it('should map all order properties correctly', async () => {
            const items = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(2),
                    unitPrice: Money.create(15),
                }),
            ];
            const order = Order.create('customer-1', items);
            const query = new ListOrdersQuery('customer-1');

            orderRepository.findByCustomerId.mockResolvedValue([order]);

            const result = await handler.execute(query);

            expect(result.orders[0].id).toBe(order.id);
            expect(result.orders[0].customerId).toBe('customer-1');
            expect(result.orders[0].items.length).toBe(1);
            expect(result.orders[0].status).toBe('PENDING');
            expect(result.orders[0].totalAmount).toBe(30);
        });

        it('should handle orders with different statuses', async () => {
            const items1 = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(10),
                }),
            ];
            const items2 = [
                OrderItem.create({
                    id: 'item-2',
                    productId: 'product-2',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(20),
                }),
            ];

            const order1 = Order.create('customer-1', items1);
            const order2 = Order.create('customer-1', items2);
            order2.confirm();

            const query = new ListOrdersQuery('customer-1');

            orderRepository.findByCustomerId.mockResolvedValue([order1, order2]);

            const result = await handler.execute(query);

            expect(result.orders[0].status).toBe('PENDING');
            expect(result.orders[1].status).toBe('CONFIRMED');
        });

        it('should return empty list when customerId is not provided', async () => {
            const query = new ListOrdersQuery();

            const result = await handler.execute(query);

            expect(result.orders.length).toBe(0);
            expect(result.total).toBe(0);
            expect(orderRepository.findByCustomerId).not.toHaveBeenCalled();
        });
    });
});
