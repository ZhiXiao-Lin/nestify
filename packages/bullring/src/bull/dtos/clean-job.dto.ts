import { JobStatusClean } from "bull";

export class CleanJobDto {
    grace: number;
    status?: JobStatusClean;
    limit?: number;
}