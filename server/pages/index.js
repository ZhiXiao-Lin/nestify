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

@withRouter
export default class extends Component {
	renderHandler = () => ({ siteInfo }) => {
		const { setting, openInfo } = siteInfo;

		return (
			<div className="hdz-home-body">
				<div className="hdz-top-content">
					<Menu />
					<Annoucement />
					<div className="main-content">
						<TourGuide />
						<div className="main-info">
							<div className="main-top">
								<Slider width="300px" interval={2000} list={[{ title:"萍安钢铁预备役加强军事训练与管理", img: "/static/banner_01.jpg" }, { title:"萍安钢铁预备役加强军事训练与管理", img: "/static/banner_02.jpg" }]} />
								<News />
								<Video />
							</div>
							<div className="main-middle">
								<div className="news-tab">
									<a href="javascript:;" className="active">景点一览</a>
									<a href="javascript:;">更多</a>
								</div>
								<div className="senic-show">
									<a href="javascript:;" style={{ backgroundImage: `url(/static/banner_01.jpg)` }}>
										<p>文化景观墙</p>
									</a>
									<a href="javascript:;" style={{ backgroundImage: `url(/static/banner_02.jpg)` }}>
										<p>工匠园</p>
									</a>
									<a href="javascript:;" style={{ backgroundImage: `url(/static/banner_03.jpg)` }}>
										<p>樱花林广场</p>
									</a>
									<a href="javascript:;" style={{ backgroundImage: `url(/static/banner_04.jpg)` }}>
										<p>焦化厂湿地景观</p>
									</a>
								</div>
							</div>
							<div className="main-bottom">
								<a href="javascript:;"></a>
								<a href="javascript:;"></a>
								<a href="javascript:;"></a>
							</div>
						</div>
					</div>
				</div>

				<div className="hdz-middle-content">
					<div className="middle-banner"></div>
					<Swiper swiperList={[{ img: '/static/temp_img.jpg' }, { img: '/static/temp_img.jpg' }, { img: '/static/temp_img.jpg' }, { img: '/static/temp_img.jpg' }]} />
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
								<a href="javascript:;">查看更多 >></a>
							</p>
						</div>
						<div className="intro-more">
							<a href="javascript:;"></a>
							<a href="javascript:;"></a>
							<a href="javascript:;"></a>
						</div>
					</div>

					<div className="category">
						<a href="javascript:;"></a>
						<a href="javascript:;"></a>
						<a href="javascript:;"></a>
						<a href="javascript:;"></a>
						<a href="javascript:;"></a>
						<a href="javascript:;"></a>
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
