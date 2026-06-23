export interface IUseCase<IRequest, IResponse> {
    execute(request: IRequest): Promise<IResponse>;
}

export interface IQuery<IResponse> {
    execute(): Promise<IResponse>;
}
