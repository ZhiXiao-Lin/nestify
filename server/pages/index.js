import React, { Component } from 'react';
import { withRouter } from 'next/router';

import HomeLayout from './layouts/HomeLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import Annoucement from './components/Annoucement';
import TourGuide from './components/TourGuide';
import News from './components/News';
import Video from './components/Video';
import Slider from './components/Slider';
import Swiper from './components/Swiper';

import './styles/index.scss';
import config from './_config';

@withRouter
export default class extends Component {
	renderHandler = () => ({ news_list, activity_list, notice_list, scenic_list, characteristic_list }) => {

		let characteristic_img_list = characteristic_list[0].slice(0,10).map(item => ({ link: `${config.CONTENT_DETAIL_URL}/${item.id}`, img: item.thumbnailPath }));
		let news_img_list = news_list[0].slice(0, 4).map(item => ({ link: `${config.CONTENT_DETAIL_URL}/${item.id}`, img: item.thumbnailPath, title: item.title }))

		return (
			<div className="hdz-home-body">
				<div className="hdz-top-content">
					<Menu />
					<Annoucement list={notice_list[0]} />
					<div className="main-content">
						<TourGuide />
						<div className="main-info">
							<div className="main-top">
								<Slider width="300px" interval={2000} list={news_img_list} />
								<News activity={activity_list[0]} news={news_list[0]} />
								<Video />
							</div>
							<div className="main-middle">
								<div className="news-tab">
									<a href="javascript:;" className="active">景点一览</a>
									<a href="/list/scenery">更多</a>
								</div>
								<div className="senic-show">
									{scenic_list[0].map(item => (
										<a key={item.id} href={`${config.CONTENT_DETAIL_URL}/${item.id}`} style={{ backgroundImage: `url(${item.thumbnailPath})` }}>
											<p>{item.title}</p>
										</a>
									))}
								</div>
							</div>
							<div className="main-bottom">
								<a href="https://720yun.com/t/d13jOO4yzu1?scene_id=3465120"></a>
								<a href="/image/guide"></a>
								<a href="/image/photo"></a>
							</div>
						</div>
					</div>
				</div>

				<div className="hdz-middle-content">
					<div className="middle-banner"></div>
					<Swiper swiperList={characteristic_img_list} />
				</div>

				<div className="hdz-bottom-content">

					<div className="senic-intro">
						<div className="intro-content">
							<p>方大特钢生态森林旅游式工厂</p>
							<p>
								<span className="divider-horizental"></span>
							</p>
							<p>在英雄城江西南昌的青山湖区，方大特钢挺拔高耸的“钢筋铁骨”下，一棵棵红榉、香樟、银杏争先竞美；在长江之滨方大九江钢铁，经污水处理净化后的清水池中，一群群金鱼欢快地畅游其中，绿草茵茵、绿树掩映、群鸟飞舞，构筑了一段长江最美岸线。</p>
							<p>
								<a href="/video/characteristic">查看更多 >></a>
							</p>
						</div>
						<div className="intro-more">
							<a href="/image/specialty"></a>
							<a href="/image/crafts"></a>
							<a href="/content/introduction"></a>
						</div>
					</div>

					<div className="category">
						<a href="/image/delicious"></a>
						<a href="/image/hotel"></a>
						<a href="/image/shopping"></a>
						<a href="/image/entertainment"></a>
						<a href="/image/trips"></a>
						<a href="/image/travels"></a>
					</div>
				</div>
			</div>
		);
	}
	render() {
		return (
			<HomeLayout>
				<GlobalContext.Consumer>
					{this.renderHandler()}
				</GlobalContext.Consumer>
			</HomeLayout>
		);
	}
}
