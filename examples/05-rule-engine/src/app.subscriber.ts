import { Subscriber, Listener } from '@nestify/event-bus';

@Subscriber()
export class AppSubscriber {
  @Listener({ event: 'rule:before' })
  async before(rules, facts) {
    console.log('rule:before --->', rules, facts);
  }

  @Listener({ event: 'rule:test:beforeEvaluate' })
  async beforeEvaluate(rules, facts) {
    console.log('rule:test:beforeEvaluate --->', rules, facts);
  }
}
