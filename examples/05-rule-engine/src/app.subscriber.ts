import { Subscriber, Listener } from '@nestify/event-bus';

@Subscriber()
export class AppSubscriber {
  @Listener({ event: 'rule:before' })
  async before(rules, facts) {
    console.log(rules, facts);
  }
}
