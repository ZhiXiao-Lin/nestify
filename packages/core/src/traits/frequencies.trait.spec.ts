import { UseTraits } from './trait';
import { FrequenciesTrait } from './frequencies.trait';

@UseTraits(FrequenciesTrait)
class Schedule {
    public readonly that = (this as unknown) as Schedule & FrequenciesTrait;

    public expression: string = '* * * * *';
    public timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;
}

describe('Trait', () => {
    let schedule: Schedule = null;

    beforeEach(() => {
        schedule = new Schedule();
    });

    it('The behavior of the setTimezone method should be correct', () => {
        schedule.that.setTimezone('Europe/London');
        expect(schedule.timezone).toEqual('Europe/London');
    });

    it('The behavior of the everyMinute method should be correct', () => {
        schedule.that.everyMinute();
        expect(schedule.expression).toEqual('* * * * *');
    });

    it('The behavior of the everyFiveMinutes method should be correct', () => {
        schedule.that.everyFiveMinutes();
        expect(schedule.expression).toEqual('*/5 * * * *');
    });

    it('The behavior of the everyTenMinutes method should be correct', () => {
        schedule.that.everyTenMinutes();
        expect(schedule.expression).toEqual('*/10 * * * *');
    });

    it('The behavior of the everyFifteenMinutes method should be correct', () => {
        schedule.that.everyFifteenMinutes();
        expect(schedule.expression).toEqual('*/15 * * * *');
    });

    it('The behavior of the everyThirtyMinutes method should be correct', () => {
        schedule.that.everyThirtyMinutes();
        expect(schedule.expression).toEqual('0,30 * * * *');
    });

    it('The behavior of the hourly method should be correct', () => {
        schedule.that.hourly();
        expect(schedule.expression).toEqual('0 * * * *');
    });

    it('The behavior of the hourlyAt method should be correct', () => {
        schedule.that.hourlyAt(17);
        expect(schedule.expression).toEqual('17 * * * *');

        schedule.that.hourlyAt(10, 20);
        expect(schedule.expression).toEqual('10,20 * * * *');

        schedule.that.hourlyAt(10, 20, 30);
        expect(schedule.expression).toEqual('10,20,30 * * * *');
    });

    it('The behavior of the daily method should be correct', () => {
        schedule.that.daily();
        expect(schedule.expression).toEqual('0 0 * * *');
    });

    it('The behavior of the dailyAt method should be correct', () => {
        schedule.that.dailyAt('8');
        expect(schedule.expression).toEqual('0 8 * * *');

        schedule.that.dailyAt('8:40');
        expect(schedule.expression).toEqual('40 8 * * *');
    });

    it('The behavior of the at method should be correct', () => {
        schedule.that.at('8');
        expect(schedule.expression).toEqual('0 8 * * *');

        schedule.that.at('8:40');
        expect(schedule.expression).toEqual('40 8 * * *');
    });

    it('The behavior of the twiceDaily method should be correct', () => {
        schedule.that.twiceDaily();
        expect(schedule.expression).toEqual('0 1,13 * * *');

        schedule.that.twiceDaily(2);
        expect(schedule.expression).toEqual('0 2,13 * * *');

        schedule.that.twiceDaily(1, 12);
        expect(schedule.expression).toEqual('0 1,12 * * *');
    });

    it('The behavior of the weekly method should be correct', () => {
        schedule.that.weekly();
        expect(schedule.expression).toEqual('0 0 * * 0');
    });

    it('The behavior of the weeklyOn method should be correct', () => {
        schedule.that.weeklyOn(1, '8:02');
        expect(schedule.expression).toEqual('2 8 * * 1');
    });

    it('The behavior of the monthly method should be correct', () => {
        schedule.that.monthly();
        expect(schedule.expression).toEqual('0 0 1 * *');
    });

    it('The behavior of the monthlyOn method should be correct', () => {
        schedule.that.monthlyOn(4, '05:01');
        expect(schedule.expression).toEqual('1 5 4 * *');
    });

    it('The behavior of the twiceMonthly method should be correct', () => {
        schedule.that.twiceMonthly(4, 6);
        expect(schedule.expression).toEqual('0 0 4,6 * *');
    });

    it('The behavior of the quarterly method should be correct', () => {
        schedule.that.quarterly();
        expect(schedule.expression).toEqual('0 0 1 1-12/3 *');
    });

    it('The behavior of the yearly method should be correct', () => {
        schedule.that.yearly();
        expect(schedule.expression).toEqual('0 0 1 1 *');
    });

    it('The behavior of the weekdays method should be correct', () => {
        schedule.that.weekdays();
        expect(schedule.expression).toEqual('* * * * 1-5');
    });

    it('The behavior of the weekends method should be correct', () => {
        schedule.that.weekends();
        expect(schedule.expression).toEqual('* * * * 0,6');
    });

    it('The behavior of the mondays method should be correct', () => {
        schedule.that.mondays();
        expect(schedule.expression).toEqual('* * * * 1');
    });

    it('The behavior of the tuesdays method should be correct', () => {
        schedule.that.tuesdays();
        expect(schedule.expression).toEqual('* * * * 2');
    });

    it('The behavior of the wednesdays method should be correct', () => {
        schedule.that.wednesdays();
        expect(schedule.expression).toEqual('* * * * 3');
    });

    it('The behavior of the thursdays method should be correct', () => {
        schedule.that.thursdays();
        expect(schedule.expression).toEqual('* * * * 4');
    });

    it('The behavior of the fridays method should be correct', () => {
        schedule.that.fridays();
        expect(schedule.expression).toEqual('* * * * 5');
    });

    it('The behavior of the saturdays method should be correct', () => {
        schedule.that.saturdays();
        expect(schedule.expression).toEqual('* * * * 6');
    });

    it('The behavior of the sundays method should be correct', () => {
        schedule.that.sundays();
        expect(schedule.expression).toEqual('* * * * 0');
    });

    it('The behavior of the days method should be correct', () => {
        schedule.that.days();
        expect(schedule.expression).toEqual('* * * * *');

        schedule.that.days(1, 3, 5, 0);
        expect(schedule.expression).toEqual('* * * * 1,3,5,0');
    });
});
