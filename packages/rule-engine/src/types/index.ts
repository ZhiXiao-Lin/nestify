export type Fact = { [name: string]: any };

export type ICondition = (facts: Fact) => Promise<boolean>;

export type IAction = (facts: Fact) => Promise<void>;
