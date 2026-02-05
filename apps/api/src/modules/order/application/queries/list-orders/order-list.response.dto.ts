import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from '../get-order/order.response.dto';

export class OrderListResponseDto {
    @ApiProperty({ type: [OrderResponseDto] })
    orders: OrderResponseDto[];

    @ApiProperty()
    total: number;
}
