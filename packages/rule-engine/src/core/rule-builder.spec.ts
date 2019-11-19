import { DefaultRule } from './rule';
import { RuleBuilder } from './rule-builder';

describe('RuleBuilder', () => {
    let rule: DefaultRule;

    beforeAll(async () => {
        rule = new RuleBuilder()
            .name('test')
            .description('A test rule')
            .priority(1)
            .when(async (facts) => 'test' === facts['value'])
            .then(async (facts) => console.log('action 1'))
            .then(async (facts) => console.log('action 2'))
            .build() as DefaultRule;
    });

    it('name should be correctly', async () => {
        expect(rule._name).toEqual('test');
    });

    it('description should correctly', async () => {
        expect(rule._description).toEqual('A test rule');
    });

    it('priority should correctly', async () => {
        expect(rule._priority).toEqual(1);
    });

    it('evaluate should correctly', async () => {
        expect(await rule.evaluate({ value: 'test' })).toEqual(true);
    });

    it('execute should correctly', async () => {
        expect(await rule.execute({ value: 'test' })).toBeUndefined();
    });
});
