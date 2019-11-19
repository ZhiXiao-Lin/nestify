import { Fact } from '../types';
import { DefaultRule } from './rule';

describe('Rule', () => {
    let rule: DefaultRule;

    beforeAll(async () => {
        const condition = async (facts: Fact) => {
            return 'test' === facts['value'];
        };

        const action = async (facts: Fact) => {
            console.log('action', facts);
        };

        rule = new DefaultRule(condition, [action], 'test rule', 'A test rule', 1);
    });

    it('evaluate should correctly', async () => {
        expect(await rule.evaluate({ value: 'test' })).toEqual(true);
    });

    it('execute should correctly', async () => {
        expect(await rule.execute({ value: 'test' })).toBeUndefined();
    });
});
