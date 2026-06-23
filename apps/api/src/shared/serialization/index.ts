import { Module } from '@nestjs/common';

export * from './serializer';
export * from './example';

@Module({})
export class SerializationModule {}
