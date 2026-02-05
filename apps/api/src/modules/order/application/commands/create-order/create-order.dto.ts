import { IsString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
    @ApiProperty({ example: 'product-123' })
    @IsString()
    productId: string;

    @ApiProperty({ example: 2 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({ example: 10.99 })
    @IsNumber()
    @Min(0)
    unitPrice: number;
}

export class CreateOrderDto {
    @ApiProperty({ example: 'customer-456' })
    @IsString()
    customerId: string;

    @ApiProperty({ type: [CreateOrderItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];
}
