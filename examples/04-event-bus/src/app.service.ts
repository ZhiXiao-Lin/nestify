import { Injectable } from '@nestjs/common';
import { EventBusService } from '@nestify/event-bus';

@Injectable()
export class AppService {

  constructor(private readonly event: EventBusService) { }

  async getHello() {
    const msg = 'Hello World!';
    const result = await this.event.emit('newRequest', msg);
    console.log(result);

    return msg;
  }
}
