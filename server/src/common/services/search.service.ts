import { Injectable } from '@nestjs/common';
import { es, esb } from '../lib/elastic-search';
import { Content } from '../entities/content.entity';

@Injectable()
export class SearchService {
    async search(payload: any) {
        const qb = new esb.RequestBodySearch();

        if (!!payload.keyword) {
            qb.query(new esb.MatchQuery(payload.field, payload.keyword));
        }

        if (!payload.page) {
            payload.page = 1;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }
        qb.size(payload.pageSize).from((payload.page - 1) * payload.pageSize);

        return await es.search({
            index: payload.index || Content.esIndex.index,
            type: payload.type || Content.esIndex.body.type,
            body: qb.toJSON()
        });
    }
}
