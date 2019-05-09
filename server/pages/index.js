import React, { Component } from 'react';
import { withRouter } from 'next/router';

import BaseLayout from './layouts/BaseLayout';
import GlobalContext from './contexts/GlobalContext';

import './index.scss';

@withRouter
export default class extends Component {
	render() {
		return (
			<BaseLayout>
				<GlobalContext.Consumer>
					{(context) => {
						const { data: { siteInfo } } = context;
						console.log(context);

						return (
							<div className="title">
								<h1 className="hello">{siteInfo.title}</h1>
								<h4>真的是个牛逼的框架啊！！！</h4>
							</div>
						);
					}}
				</GlobalContext.Consumer>
			</BaseLayout>
		);
	}
}
