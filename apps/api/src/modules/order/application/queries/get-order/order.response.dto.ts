import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    productId: string;

    @ApiProperty()
    quantity: number;

    @ApiProperty()
    unitPrice: number;

    @ApiProperty()
    totalPrice: number;
}

export class OrderResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    customerId: string;

    @ApiProperty({ type: [OrderItemResponseDto] })
    items: OrderItemResponseDto[];

    @ApiProperty()
    status: string;

    @ApiProperty()
    totalAmount: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
