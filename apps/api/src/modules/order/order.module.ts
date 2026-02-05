import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderController } from './presentation/order.controller';
import { OrderRepository } from './infrastructure/persistence/kysely-order.repository';
import { OrderCacheService } from './infrastructure/cache/order-cache.service';
import { ORDER_REPOSITORY } from './domain/repositories/order.repository.interface';
import { CreateOrderHandler } from './application/commands/create-order/create-order.handler';
import { ConfirmOrderHandler } from './application/commands/confirm-order/confirm-order.handler';
import { CancelOrderHandler } from './application/commands/cancel-order/cancel-order.handler';
import { GetOrderHandler } from './application/queries/get-order/get-order.handler';
import { ListOrdersHandler } from './application/queries/list-orders/list-orders.handler';
import { OrderCreatedHandler } from './application/event-handlers/order-created.handler';
import { OrderConfirmedHandler } from './application/event-handlers/order-confirmed.handler';
import { OrderPricingService } from './domain/services/order-pricing.service';
import { EventBusService } from '@/shared/infrastructure/messaging/event-bus.service';
import { EVENT_BUS } from '@/shared/infrastructure/messaging/event-bus.interface';

const CommandHandlers = [CreateOrderHandler, ConfirmOrderHandler, CancelOrderHandler];
const QueryHandlers = [GetOrderHandler, ListOrdersHandler];
const EventHandlers = [OrderCreatedHandler, OrderConfirmedHandler];

@Module({
    imports: [CqrsModule],
    controllers: [OrderController],
    providers: [
        ...CommandHandlers,
        ...QueryHandlers,
        ...EventHandlers,
        OrderPricingService,
        OrderCacheService,
        {
            provide: ORDER_REPOSITORY,
            useClass: OrderRepository,
        },
        {
            provide: EVENT_BUS,
            useClass: EventBusService,
        },
    ],
    exports: [OrderCacheService],
})
export class OrderModule {}
