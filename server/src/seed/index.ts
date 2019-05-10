import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository, TreeRepository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { Content } from '../common/entities/content.entity';
import { Category } from '../common/entities/category.entity';
import { Setting } from '../common/entities/setting.entity';

@Injectable()
export class Seed {
	constructor(
		@InjectConnection() private readonly connection: Connection,
		@InjectRepository(Setting) private readonly settingRepository: Repository<Setting>,
		@InjectRepository(Category) private readonly categoryRepository: TreeRepository<Category>,
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

		const menuIndex = new Category('网站首页', '/', 0);

		const menuOverview = new Category('景区概况', '/overview', 1);
		const menuOverviewIntroduction = new Category('景区介绍', '/overview#introduction', 0, menuOverview);
		const menuOverviewGeography = new Category('地理概况', '/overview#geography', 1, menuOverview);
		const menuOverviewHistory = new Category('人文历史', '/overview#history', 2, menuOverview);
		const menuOverviewDevelopment = new Category('发展规划', '/overview#development', 3, menuOverview);
		const menuOverviewSpeciality = new Category('当地特产', '/overview#speciality', 4, menuOverview);
		const menuOverviewHandicraft = new Category('特色工艺品', '/overview#handicraft', 5, menuOverview);
		const menuOverviewTourist = new Category('游览须知', '/overview#tourist', 6, menuOverview);

		const menuScene = new Category('景区风光', '/scene', 2);
		const menuScene0 = new Category('景点介绍', '/scene', 0, menuScene);
		const menuScene1 = new Category('720度全景', '/scene', 1, menuScene);
		const menuScene2 = new Category('电子导游导览', '/scene', 2, menuScene);
		const menuScene3 = new Category('摄影佳作', '/scene', 3, menuScene);
		const menuScene4 = new Category('视频赏析', '/scene', 4, menuScene);

		const menuGuide = new Category('旅游攻略', '/guide', 3);
		const menuGuide0 = new Category('特色餐饮', '/guide', 0, menuGuide);
		const menuGuide1 = new Category('周边住宿', '/guide', 1, menuGuide);
		const menuGuide2 = new Category('旅游购物', '/guide', 2, menuGuide);
		const menuGuide3 = new Category('周边娱乐', '/guide', 3, menuGuide);
		const menuGuide4 = new Category('游程推荐', '/guide', 4, menuGuide);
		const menuGuide5 = new Category('美文游记', '/guide', 5, menuGuide);

		const menuNews = new Category('景区动态', '/news', 4);
		const menuNews0 = new Category('官方公告', '/news', 0, menuNews);
		const menuNews1 = new Category('精彩活动', '/news', 1, menuNews);
		const menuNews2 = new Category('新闻动态', '/news', 2, menuNews);

		const menuOfficial = new Category('集团官网', '/official', 5);

		const menuAbout = new Category('联系我们', '/about', 6);
		const menuAbout0 = new Category('联系方式', '/about', 0, menuAbout);
		const menuAbout1 = new Category('留言咨询', '/about', 1, menuAbout);
		const menuAbout2 = new Category('投诉建议', '/about', 2, menuAbout);

		await this.categoryRepository.save([
			menuIndex,
			menuOverview,
			menuScene,
			menuGuide,
			menuNews,
			menuOfficial,
			menuAbout
		]);

		await this.categoryRepository.save([
			menuOverviewIntroduction,
			menuOverviewGeography,
			menuOverviewHistory,
			menuOverviewDevelopment,
			menuOverviewSpeciality,
			menuOverviewHandicraft,
			menuOverviewTourist,

			menuScene0,
			menuScene1,
			menuScene2,
			menuScene3,
			menuScene4,

			menuGuide0,
			menuGuide1,
			menuGuide2,
			menuGuide3,
			menuGuide4,
			menuGuide5,

			menuNews0,
			menuNews1,
			menuNews2,

			menuAbout0,
			menuAbout1,
			menuAbout2
		]);

		await this.connection.getRepository(Content).insert([
			{
				title: '这是一篇测试文章',
				user: admin
			}
		]);
	}
}
