import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmOrderDto {
    @ApiProperty({ example: 'order-id-123' })
    @IsString()
    orderId: string;
}
