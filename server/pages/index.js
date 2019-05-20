import React, { Component } from 'react';
import { withRouter } from 'next/router';

import HomeLayout from './layouts/HomeLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import Annoucement from './components/Annoucement';
import Slider from './components/Slider';
import Swiper from './components/Swiper';

import './styles/index.scss';

@withRouter
export default class extends Component {
	state = {
		current: 1
	}
	onClickHandler = (flag) => () => {
		if (Object.prototype.toString.call(flag) === '[object Number]') {
			return this.setState({ current: flag });
		} else {
			return;
		}
	}
	renderHandler = () => ({ siteInfo }) => {
		const { setting } = siteInfo;
		const { current } = this.state;
		
		return (
			<div className="hdz-home-body">
				<div className="hdz-top-content">
					<Menu />
					<Annoucement />
					<div className="main-content">
						<div className="tour-guide">
							<div className="guide">
								<div className="img-blank"></div>
								<div>
									<p>开放时间：</p>
									<p>方大特钢生态森林全面对外开放</p>
								</div>
								<div>{setting.openInfo.map((info, i) => <p>{info}</p> )}</div>
								<a className="guide-more" href="javascript:;"></a>
							</div>
							<div className="phone-call">
								<div className="24hours-calling">
									<p>48小时服务电话</p>
									<p>{setting.hotline}</p>
								</div>
								<div className="ohter-calling">
									<p>景区办公电话：{setting.officialLine}</p>
									<p>商务合作热线：{setting.serviceLine}</p>
									<p>票务预订热线：{setting.saleLine}</p>
								</div>
							</div>
						</div>
						<div className="main-info">
							<div className="main-top">
								<Slider width="300px" interval={2000} list={[{ title:"萍安钢铁预备役加强军事训练与管理", img: "/static/banner_01.jpg" }, { title:"萍安钢铁预备役加强军事训练与管理", img: "/static/banner_02.jpg" }]} />
								<div className="main-news">
									<div className="news-tab">
										<a href="javascript:;" className={`${current === 1 ? 'active' : ''}`} onClick={this.onClickHandler(1)}>精彩活动</a>
										<a href="javascript:;" className={`${current === 2 ? 'active' : ''}`} onClick={this.onClickHandler(2)}>新闻动态</a>
										<a href="javascript:;">更多</a>
									</div>
									<div className="news-hot">
										<p>方大特钢：员工“获得感”彰显企业含金量</p>
										<p>以员工对美好生活的向往为企业的奋斗目标，让改革催动以员工对美好生活的向往为企业的奋斗目标，让改革催动以员工对美好生活的向往为企业的奋斗目标，让改革催动</p>
									</div>
									<div className="news-list">
										<p>
											<p>方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</p>
											<span>2019-03-26</span>
										</p>
										<p>
											<p>方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</p>
											<span>2019-03-26</span>
										</p>
										<p>
											<p>方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</p>
											<span>2019-03-26</span>
										</p>
										<p>
											<p>方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</p>
											<span>2019-03-26</span>
										</p>
									</div>
								</div>
								<div className="main-video">
									<p>视频赏析</p>
									<video controls autoPlay muted>
										<source src="/static/video/AngryBird.mp4" />
									</video>
									<a href="javascript:;"></a>
								</div>
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
