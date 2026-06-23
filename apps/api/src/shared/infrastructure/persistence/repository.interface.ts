import type { IRepository as DddRepository } from '@a3s-lab/ddd';

export type IRepository<T> = DddRepository<string, T>;
