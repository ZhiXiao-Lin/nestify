import { LoggerLevel, LoggerModule, LoggerService } from "@nestify/logger";
import { Module } from "@nestjs/common";
import { transports } from "winston";
import { LoggerProvider } from "./providers";

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
    providers: [
        LoggerProvider
    ],
    exports: [
        LoggerProvider
    ]
})
export class CommonModule { }