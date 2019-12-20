import { Inject, Injectable } from "@nestjs/common";
import { Queue } from "bull";
import { BULL_OPTIONS } from "./bull.constants";
import { BullModuleOptions } from "./bull.interfaces";

@Injectable()
export class BullService {

    private readonly queues: Map<string, Queue>;

    constructor(
        @Inject(BULL_OPTIONS)
        private readonly options: BullModuleOptions
    ) { }
}