import { Trait } from './trait';
/*
  ┌────────────── second (optional)
  │ ┌──────────── minute
  │ │ ┌────────── hour
  │ │ │ ┌──────── day of month
  │ │ │ │ ┌────── month
  │ │ │ │ │ ┌──── day of week
  │ │ │ │ │ │
  │ │ │ │ │ │
  * * * * * *
*/
export enum CronPositionEnum {
    MINUTE,
    HOUR,
    DAY_OF_MONTH,
    MONTH,
    DAY_OF_WEEK
}

export abstract class FrequenciesTrait extends Trait {
    private readonly that: any;

    public cron(expression: string) {
        this.that.expression = expression;
        return this;
    }

    public everyMinute() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE);
    }

    public everyFiveMinutes() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '*/5');
    }

    public everyTenMinutes() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '*/10');
    }

    public everyFifteenMinutes() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '*/15');
    }

    public everyThirtyMinutes() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0,30');
    }

    public hourly() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0');
    }

    public hourlyAt(...offset: number[]) {
        let segments = Array.isArray(offset) ? offset.join(',') : offset;
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, segments);
    }

    public daily() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0').spliceIntoPosition(CronPositionEnum.HOUR, '0');
    }

    public at(time: string) {
        return this.dailyAt(time);
    }

    public dailyAt(time: string) {
        const segments = time.split(':');
        return this.spliceIntoPosition(CronPositionEnum.HOUR, parseInt(segments[0]).toString()).spliceIntoPosition(
            CronPositionEnum.MINUTE,
            segments.length === 2 ? parseInt(segments[1]).toString() : '0'
        );
    }

    public twiceDaily(first: number = 1, second: number = 13) {
        const hours = first + ',' + second;
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0').spliceIntoPosition(CronPositionEnum.HOUR, hours);
    }

    public weekly() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0')
            .spliceIntoPosition(CronPositionEnum.HOUR, '0')
            .spliceIntoPosition(CronPositionEnum.DAY_OF_WEEK, '0');
    }

    public weeklyOn(day: number | string, time: string = '0:0') {
        this.dailyAt(time);
        return this.spliceIntoPosition(CronPositionEnum.DAY_OF_WEEK, day.toString());
    }

    public monthly() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0')
            .spliceIntoPosition(CronPositionEnum.HOUR, '0')
            .spliceIntoPosition(CronPositionEnum.DAY_OF_MONTH, '1');
    }

    public monthlyOn(day: number | string = 1, time: string = '0:0') {
        this.dailyAt(time);
        return this.spliceIntoPosition(CronPositionEnum.DAY_OF_MONTH, day.toString());
    }

    public twiceMonthly(first: number, second: number) {
        const days = first + ',' + second;
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0')
            .spliceIntoPosition(CronPositionEnum.HOUR, '0')
            .spliceIntoPosition(CronPositionEnum.DAY_OF_MONTH, days);
    }

    public quarterly() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0')
            .spliceIntoPosition(CronPositionEnum.HOUR, '0')
            .spliceIntoPosition(CronPositionEnum.DAY_OF_MONTH, '1')
            .spliceIntoPosition(CronPositionEnum.MONTH, '1-12/3');
    }

    public yearly() {
        return this.spliceIntoPosition(CronPositionEnum.MINUTE, '0')
            .spliceIntoPosition(CronPositionEnum.HOUR, '0')
            .spliceIntoPosition(CronPositionEnum.DAY_OF_MONTH, '1')
            .spliceIntoPosition(CronPositionEnum.MONTH, '1');
    }

    public weekdays() {
        return this.spliceIntoPosition(CronPositionEnum.DAY_OF_WEEK, '1-5');
    }

    public weekends() {
        return this.spliceIntoPosition(CronPositionEnum.DAY_OF_WEEK, '0,6');
    }

    public mondays() {
        return this.days(1);
    }

    public tuesdays() {
        return this.days(2);
    }

    public wednesdays() {
        return this.days(3);
    }

    public thursdays() {
        return this.days(4);
    }

    public fridays() {
        return this.days(5);
    }

    public saturdays() {
        return this.days(6);
    }

    public sundays() {
        return this.days(0);
    }

    public days(...days: number[]) {
        return this.spliceIntoPosition(CronPositionEnum.DAY_OF_WEEK, days.length <= 0 ? '*' : days.join(','));
    }

    public setTimezone(timezone: string) {
        return (this.that.timezone = timezone);
    }

    private spliceIntoPosition(position: number, value: string = '*') {
        let segments = this.that.expression.split(' ');
        segments[position] = value;
        return this.cron(segments.join(' '));
    }
}
