import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateOrderDto } from '../application/commands/create-order/create-order.dto';
import { CreateOrderCommand } from '../application/commands/create-order/create-order.command';
import { ConfirmOrderCommand } from '../application/commands/confirm-order/confirm-order.command';
import { CancelOrderCommand } from '../application/commands/cancel-order/cancel-order.command';
import { GetOrderQuery } from '../application/queries/get-order/get-order.query';
import { ListOrdersQuery } from '../application/queries/list-orders/list-orders.query';
import { OrderResponseDto } from '../application/queries/get-order/order.response.dto';
import { OrderListResponseDto } from '../application/queries/list-orders/order-list.response.dto';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create a new order' })
    @ApiResponse({ status: 201, description: 'Order created successfully' })
    async createOrder(@Body() dto: CreateOrderDto): Promise<{ orderId: string }> {
        const command = new CreateOrderCommand(dto.customerId, dto.items);
        const orderId = await this.commandBus.execute(command);
        return { orderId };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID' })
    @ApiResponse({ status: 200, type: OrderResponseDto })
    async getOrder(@Param('id') id: string): Promise<OrderResponseDto> {
        const query = new GetOrderQuery(id);
        return this.queryBus.execute(query);
    }

    @Get()
    @ApiOperation({ summary: 'List orders' })
    @ApiResponse({ status: 200, type: OrderListResponseDto })
    async listOrders(@Query('customerId') customerId?: string): Promise<OrderListResponseDto> {
        const query = new ListOrdersQuery(customerId);
        return this.queryBus.execute(query);
    }

    @Post(':id/confirm')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Confirm an order' })
    @ApiResponse({ status: 204, description: 'Order confirmed successfully' })
    async confirmOrder(@Param('id') id: string): Promise<void> {
        const command = new ConfirmOrderCommand(id);
        await this.commandBus.execute(command);
    }

    @Post(':id/cancel')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Cancel an order' })
    @ApiResponse({ status: 204, description: 'Order cancelled successfully' })
    async cancelOrder(@Param('id') id: string): Promise<void> {
        const command = new CancelOrderCommand(id);
        await this.commandBus.execute(command);
    }
}
