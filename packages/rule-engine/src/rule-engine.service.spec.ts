import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter } from 'events';
import { Action, Condition, Rule } from './rule-engine.decorators';
import { RuleEngineModule } from './rule-engine.module';
import { RuleEngineService } from './rule-engine.service';
import { Fact } from './types';

describe('RuleEngine Service', () => {
    let module: TestingModule;
    let service: RuleEngineService;
    let event = new EventEmitter();
    let flag = false;

    @Rule({ name: 'test', description: 'A test rule' })
    class TestRule {
        @Condition()
        async condition(facts: Fact) {
            return 'test' === facts['value'];
        }

        @Action({ order: 1 })
        async action1(facts: Fact) {
            facts.value = 'action1';
            flag = true;
            console.log('action1', facts);
        }

        @Action({ order: 2 })
        async action2(facts: Fact) {
            console.log('action2', facts);
        }
    }

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [RuleEngineModule.register({ event, eventPrefix: 'rule-engine' })]
        }).compile();

        service = module.get(RuleEngineService);
    });

    beforeEach(() => {
        flag = false;
    });

    it('Will should be return a rule instance', async () => {
        const rule = service.register(TestRule);

        expect(rule).toBeDefined();
        expect(rule._name).toEqual('test');
    });

    it('Rules should be fired', async () => {
        const rule = service.register(TestRule);
        await service.fire([rule], { value: 'test' });

        expect(flag).toEqual(true);
    });
});
