import React, { Component } from 'react';
import { withRouter } from 'next/router';

import HomeLayout from './layouts/HomeLayout';
import GlobalContext from './contexts/GlobalContext';

import './styles/index.scss';

@withRouter
export default class extends Component {
	renderHandler = () => (context) => {
		const { data: { siteInfo } } = context;
		console.log(context);

		return (
			<div className="hdz-home-body">
				<p>头部</p>
				<p>导航</p>
				<p>提醒</p>
				<p>文章列表</p>
				<p>工艺特色</p>
				<p>项目简介</p>
				<p>网站分类导航</p>
				<p>页脚1</p>
				<p>页脚2</p>
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
