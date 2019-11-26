import { LoggerLevel, LoggerModule, LoggerService } from "@nestify/logger";
import { Global, Module } from "@nestjs/common";
import { transports } from "winston";

@Global()
@Module({
    imports: [
        LoggerModule.registerAsync({
            useFactory: () => ({
                level: LoggerLevel.SILLY,
                format: LoggerService.createFormat(),
                transports: [new transports.Console()]
            }),
            inject: []
        })
    ]
})
export class CommonModule { }