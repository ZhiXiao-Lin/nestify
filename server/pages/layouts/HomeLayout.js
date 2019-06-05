import React, { Component } from 'react';
import { withRouter } from 'next/router';
import { Layout, LocaleProvider } from 'antd';
import moment from 'moment';
import zh_CN from 'antd/lib/locale-provider/zh_CN';
import 'moment/locale/zh-cn';

import GlobalContext from '../contexts/GlobalContext';
import HomeBackground from '../components/HomeBackground';
import Header from '../components/Header';
import Footer from '../components/Footer';

import 'antd/dist/antd.css';
import '../styles/reset.scss';

moment.locale('zh-cn');
const { Content } = Layout;

@withRouter
export default class extends Component {
	
	render() {
		return (
			<LocaleProvider locale={zh_CN}>
				<GlobalContext.Provider value={{ ...this.state, ...this.props, ...this.props.router.query.data }}>
					<HomeBackground home />
					<Header />
					<Content>{this.props.children}</Content>
					<div className="hdz-blank-div"></div>
					<Footer />
				</GlobalContext.Provider>
			</LocaleProvider>
		);
	}
}
