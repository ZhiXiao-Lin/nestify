import { Global, Module } from '@nestjs/common';

export * from '@a3s-lab/http';

@Global()
@Module({})
export class ValidationModule {}
