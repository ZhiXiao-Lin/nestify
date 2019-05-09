import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { Content } from '../common/entities/content.entity';
import { Menu } from '../common/entities/menu.entity';
import { Setting } from '../common/entities/setting.entity';

@Injectable()
export class Seed {
	constructor(
		@InjectConnection() private readonly connection: Connection,
		@InjectRepository(Setting) private readonly settingRepository: Repository<Setting>,
		@InjectRepository(Menu) private readonly menuRepository: Repository<User>,
		@InjectRepository(User) private readonly userRepository: Repository<User>
	) {}

	async start() {
		Logger.log('seed start');

		await this.settingRepository.save(
			new Setting('default', {
				title: '方大特钢-生态森林',
				seo: {
					title: '方大特钢-生态森林',
					keywords: '方大特钢,生态森林',
					description: '厂在林中，路在绿中，人在景中'
				},
				links: [
					{ title: '国家旅游局', url: '' },
					{ title: '江西省文旅厅', url: '' },
					{ title: '江西省旅游局', url: '' },
					{ title: '江西省旅游集团', url: '' },
					{ title: '南昌市旅游局', url: '' }
				],
				openInfo: [ '周一关闭，法定节假日除外', '周二至周日，9:00--1700', '16:30游客停止入场' ],
				wechat: '',
				weibo: '',
				online: '',
				hotline: '400-888-8888',
				serviceLine: '0791-86753021',
				saleLine: '0791-86753021',
				officialLine: '0791-86753021',
				address: '江西省南昌市新建区红谷滩新区凤凰中大道890号',
				postCode: '445400',
				fax: '445400',
				copyright: 'Copyright © 2019 江西方大钢铁集团有限公司 版权所有',
				icp: '赣ICP备 10001983 号',
				techSupport: '江旅科技'
			})
		);

		const admin = new User();
		admin.mobile = '18770221825';
		admin.password = '12345678';
		await this.userRepository.save(admin);

		const menuIndex = new Menu('网站首页', '/', 0);
		const menuOverview = new Menu('景区概况', '/overview', 1);
		const menuScene = new Menu('景区风光', '/scene', 2);
		const menuGuide = new Menu('旅游攻略', '/guide', 3);
		const menuNews = new Menu('景区动态', '/news', 4);
		const menuOfficial = new Menu('集团官网', '/official', 5);
		const menuAbout = new Menu('联系我们', '/about', 6);

		await this.menuRepository.save([
			menuIndex,
			menuOverview,
			menuScene,
			menuGuide,
			menuNews,
			menuOfficial,
			menuAbout
		]);

		await this.connection.getRepository(Content).insert([
			{
				title: '这是一篇测试文章',
				user: admin
			}
		]);
	}
}
