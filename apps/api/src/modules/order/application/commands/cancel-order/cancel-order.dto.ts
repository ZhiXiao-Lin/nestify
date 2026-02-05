import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderDto {
    @ApiProperty({ example: 'order-id-123' })
    @IsString()
    orderId: string;
}
