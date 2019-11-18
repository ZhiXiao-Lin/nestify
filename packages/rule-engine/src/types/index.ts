export type Fact = { [name: string]: any };

export type Condition = (facts: Fact) => Promise<boolean>;

export type Action = (facts: Fact) => Promise<void>;
