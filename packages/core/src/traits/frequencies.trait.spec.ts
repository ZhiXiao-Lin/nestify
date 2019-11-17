import { UseTraits } from './trait';
import { FrequenciesTrait } from './frequencies.trait';

@UseTraits(FrequenciesTrait)
class Schedule {
    public readonly that = (this as unknown) as Schedule & FrequenciesTrait;

    protected expression: string = '* * * * *';
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
        expect(schedule.that.everyMinute().getCronExpression()).toEqual('* * * * *');
    });

    it('The behavior of the everyFiveMinutes method should be correct', () => {
        expect(schedule.that.everyFiveMinutes().getCronExpression()).toEqual('*/5 * * * *');
    });

    it('The behavior of the everyTenMinutes method should be correct', () => {
        expect(schedule.that.everyTenMinutes().getCronExpression()).toEqual('*/10 * * * *');
    });

    it('The behavior of the everyFifteenMinutes method should be correct', () => {
        expect(schedule.that.everyFifteenMinutes().getCronExpression()).toEqual('*/15 * * * *');
    });

    it('The behavior of the everyThirtyMinutes method should be correct', () => {
        expect(schedule.that.everyThirtyMinutes().getCronExpression()).toEqual('0,30 * * * *');
    });

    it('The behavior of the hourly method should be correct', () => {
        expect(schedule.that.hourly().getCronExpression()).toEqual('0 * * * *');
    });

    it('The behavior of the hourlyAt method should be correct', () => {
        expect(schedule.that.hourlyAt(17).getCronExpression()).toEqual('17 * * * *');

        expect(schedule.that.hourlyAt(10, 20).getCronExpression()).toEqual('10,20 * * * *');

        expect(schedule.that.hourlyAt(10, 20, 30).getCronExpression()).toEqual('10,20,30 * * * *');
    });

    it('The behavior of the daily method should be correct', () => {
        expect(schedule.that.daily().getCronExpression()).toEqual('0 0 * * *');
    });

    it('The behavior of the dailyAt method should be correct', () => {
        expect(schedule.that.dailyAt('8').getCronExpression()).toEqual('0 8 * * *');
        expect(schedule.that.dailyAt('8:40').getCronExpression()).toEqual('40 8 * * *');
    });

    it('The behavior of the at method should be correct', () => {
        expect(schedule.that.at('8').getCronExpression()).toEqual('0 8 * * *');
        expect(schedule.that.at('8:40').getCronExpression()).toEqual('40 8 * * *');
    });

    it('The behavior of the twiceDaily method should be correct', () => {
        expect(schedule.that.twiceDaily().getCronExpression()).toEqual('0 1,13 * * *');
        expect(schedule.that.twiceDaily(2).getCronExpression()).toEqual('0 2,13 * * *');
        expect(schedule.that.twiceDaily(1, 12).getCronExpression()).toEqual('0 1,12 * * *');
    });

    it('The behavior of the weekly method should be correct', () => {
        expect(schedule.that.weekly().getCronExpression()).toEqual('0 0 * * 0');
    });

    it('The behavior of the weeklyOn method should be correct', () => {
        expect(schedule.that.weeklyOn(1, '8:02').getCronExpression()).toEqual('2 8 * * 1');
    });

    it('The behavior of the monthly method should be correct', () => {
        expect(schedule.that.monthly().getCronExpression()).toEqual('0 0 1 * *');
    });

    it('The behavior of the monthlyOn method should be correct', () => {
        expect(schedule.that.monthlyOn(4, '05:01').getCronExpression()).toEqual('1 5 4 * *');
    });

    it('The behavior of the twiceMonthly method should be correct', () => {
        expect(schedule.that.twiceMonthly(4, 6).getCronExpression()).toEqual('0 0 4,6 * *');
    });

    it('The behavior of the quarterly method should be correct', () => {
        expect(schedule.that.quarterly().getCronExpression()).toEqual('0 0 1 1-12/3 *');
    });

    it('The behavior of the yearly method should be correct', () => {
        expect(schedule.that.yearly().getCronExpression()).toEqual('0 0 1 1 *');
    });

    it('The behavior of the weekdays method should be correct', () => {
        expect(schedule.that.weekdays().getCronExpression()).toEqual('* * * * 1-5');
    });

    it('The behavior of the weekends method should be correct', () => {
        expect(schedule.that.weekends().getCronExpression()).toEqual('* * * * 0,6');
    });

    it('The behavior of the mondays method should be correct', () => {
        expect(schedule.that.mondays().getCronExpression()).toEqual('* * * * 1');
    });

    it('The behavior of the tuesdays method should be correct', () => {
        expect(schedule.that.tuesdays().getCronExpression()).toEqual('* * * * 2');
    });

    it('The behavior of the wednesdays method should be correct', () => {
        expect(schedule.that.wednesdays().getCronExpression()).toEqual('* * * * 3');
    });

    it('The behavior of the thursdays method should be correct', () => {
        expect(schedule.that.thursdays().getCronExpression()).toEqual('* * * * 4');
    });

    it('The behavior of the fridays method should be correct', () => {
        expect(schedule.that.fridays().getCronExpression()).toEqual('* * * * 5');
    });

    it('The behavior of the saturdays method should be correct', () => {
        expect(schedule.that.saturdays().getCronExpression()).toEqual('* * * * 6');
    });

    it('The behavior of the sundays method should be correct', () => {
        expect(schedule.that.sundays().getCronExpression()).toEqual('* * * * 0');
    });

    it('The behavior of the days method should be correct', () => {
        expect(schedule.that.days().getCronExpression()).toEqual('* * * * *');

        expect(schedule.that.days(1, 3, 5, 0).getCronExpression()).toEqual('* * * * 1,3,5,0');
    });
});
