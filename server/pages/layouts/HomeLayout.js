import React, { Component } from 'react';
import { withRouter } from 'next/router';
import { Layout, LocaleProvider } from 'antd';
import moment from 'moment';

import 'moment/locale/zh-cn';
import zh_CN from 'antd/lib/locale-provider/zh_CN';

import GlobalContext from '../contexts/GlobalContext';

import 'antd/dist/antd.css';
import '../styles/reset.less';

import Header from '../header';

moment.locale('zh-cn');
const { Content } = Layout;

@withRouter
export default class extends Component {
    render() {
        return (
            <LocaleProvider locale={zh_CN}>
                <GlobalContext.Provider
                    value={{ ...this.state, ...this.props, ...this.props.router.query.data }}
                >
                    <Header />
                    <Content>{this.props.children}</Content>
                </GlobalContext.Provider>
            </LocaleProvider>
        );
    }
}
