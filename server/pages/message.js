import React, { Component } from 'react';
import { withRouter } from 'next/router';
import { Pagination, Divider } from 'antd';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';
import PaginationList from './components/Pagination';

import config from './_config';

import './styles/introduction.scss';

@withRouter
export default class extends Component {
    onChange = (page) => {
        window.location.href = `${window.location.pathname}?page=${page - 1}`;
    }
    renderHandler = () => ({ siteInfo, list, router }) => {
        const { setting } = siteInfo;
        let { query: { page }, asPath } = router;

        return (
            <div className="hdz-home-body">
                <Menu />
                <BreadCrumbs />
                <div className="introduction-content">
                    <div className="guide-navi">
                        <NaviPanel />
                        <TourGuide.Contact setting={setting} />
                    </div>
                    <div className="intro-main">
                        <div className="main-title">
                            <span>留言咨询</span>
                        </div>
                        <div className="main-content">

                            <div className="message-view">
                                <div className="send-message">
                                    <a href="/suggestions">我要留言</a>
                                </div>
                                <div className="message-list">
                                    {list[0].map(item => (
                                        <div className="message-item-container" key={item.id}>
                                            <div className="message-item">
                                                <p>{item.ex_info.question}</p>
                                                <p>{item.ex_info.reply ? item.ex_info.reply : '【很抱歉，管理员还没有来得及回复哦！】'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <PaginationList
                                    showQuickJumper
                                    total={list[1]}
                                    defaultPageSize={10}
                                    current={1}
                                    onChange={this.onChange}
                                />
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        );
    }
    render() {
        return (
            <CommonLayout>
                <GlobalContext.Consumer>
                    {this.renderHandler()}
                </GlobalContext.Consumer>
            </CommonLayout>
        );
    }
}
