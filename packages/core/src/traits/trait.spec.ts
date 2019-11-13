import { Trait, UseTraits } from './trait';

abstract class FrequenciesTrait extends Trait {
    public expression: string = '* * * * *';

    public cron(expression: string) {
        this.expression = expression;
        return this;
    }

    public everyMinute() {
        console.log('FrequenciesTrait: everyMinute');
        return this.cron('* 1 * * *');
    }
}

abstract class QueueTrait extends Trait {
    private job: any;

    public async push(options: any) {
        console.log('QueueTrait.push', options);
        return await this.job();
    }
}

@UseTraits(FrequenciesTrait, QueueTrait)
class Schedule {
    private readonly that = (this as unknown) as Schedule & FrequenciesTrait & QueueTrait;
    public job: any;

    public call(callback: any) {
        this.job = callback;
        return this.that;
    }

    public run() {
        return this.job(this.that.expression);
    }

    public async runInQueue() {
        return await this.that.push({ corn: this.that.expression });
    }
}

describe('Trait', () => {
    let schedule: Schedule = null;

    beforeEach(() => {
        schedule = new Schedule();
    });

    it('Will the trait methods should be defined', () => {
        expect(schedule.call(() => {}).everyMinute).toBeDefined();
        expect(schedule.call(() => {}).everyMinute().run).toBeDefined();
        expect(schedule.call(() => {}).runInQueue).toBeDefined();
    });

    it('Will the job result should be defined', async () => {
        const result = await schedule
            .call(async () => true)
            .everyMinute()
            .runInQueue();

        expect(result).toEqual(true);
    });
});
