export interface INotifiable {
    send(): Promise<boolean>;
}
