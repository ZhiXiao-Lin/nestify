import { Subscriber, Listener } from '@nestify/event-bus';

@Subscriber()
export class AppSubscriber {
  @Listener({ event: 'newRequest' })
  async newRequest(eventData: any) {
    console.log(eventData);
  }
}
