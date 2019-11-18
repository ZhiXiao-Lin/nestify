import { Fact } from '../types';
import { Rule } from './rule';

describe('Rule', () => {
    let rule: Rule;

    beforeAll(async () => {
        const condition = async (facts: Fact) => {
            return 'test' === facts['value'];
        };

        const action = async (facts: Fact) => {
            console.log('action', facts);
        };

        rule = new Rule(condition, [action], 'test rule', 'A test rule', 1);
    });

    it('evaluate should correctly', async () => {
        expect(await rule.evaluate({ value: 'test' })).toEqual(true);
    });

    it('execute should correctly', async () => {
        expect(await rule.execute({ value: 'test' })).toBeUndefined();
    });
});
