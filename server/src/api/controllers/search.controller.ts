import { ApiUseTags, ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards, Post, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Api } from '../../common/aspects/decorator';
import { SearchService } from '../../common/services/search.service';

@Api('search')
@ApiUseTags('search')
@ApiBearerAuth()
@UseGuards(AuthGuard())
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Post()
    async search(@Body() payload) {
        return await this.searchService.search(payload);
    }
}
