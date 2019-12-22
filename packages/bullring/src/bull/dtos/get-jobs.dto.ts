import { JobStatus } from 'bull';

export class GetJobsDto {
    status: JobStatus[];
    start?: number;
    end?: number;
    asc?: boolean;
}
