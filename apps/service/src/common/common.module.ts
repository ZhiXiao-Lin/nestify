import { LoggerLevel, LoggerModule, LoggerService } from "@nestify/logger";
import { Module } from "@nestjs/common";
import { transports } from "winston";

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
    ],
    exports: [LoggerModule]
})
export class CommonModule { }