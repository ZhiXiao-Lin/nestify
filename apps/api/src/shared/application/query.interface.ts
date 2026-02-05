export interface IQuery<IResponse> {
    execute(): Promise<IResponse>;
}
