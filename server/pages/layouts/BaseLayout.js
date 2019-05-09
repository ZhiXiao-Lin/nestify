import React, { Component } from 'react';
import { withRouter } from 'next/router';
import { Layout } from 'antd';

import GlobalContext from '../contexts/GlobalContext';

import 'antd/dist/antd.css';
import './reset.scss';

const { Header, Content, Footer } = Layout;

@withRouter
export default class extends Component {
	render() {
		return (
			<GlobalContext.Provider value={{ ...this.state, ...this.props, ...this.props.router.query }}>
				<Layout>
					<Header />
					<Content>{this.props.children}</Content>
					<Footer />
				</Layout>
			</GlobalContext.Provider>
		);
	}
}
