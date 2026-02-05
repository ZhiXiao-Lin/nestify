export abstract class BaseDto {
    constructor(partial?: Partial<any>) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
}
