import React, { Component } from 'react';
import { withRouter } from 'next/router';
import * as moment from 'moment';
import { Pagination, Divider } from 'antd';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';

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
        const notice_hot = list[0].shift();

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
                            <span>官方公告</span>
                        </div>
                        <div className="main-content">

                            <div className="announcement-view">
                                <div className="announcement-big">
                                    <div className="announcement-big-content">
                                        <p>{notice_hot.title}</p>
                                        <p>{moment(notice_hot.publish_at).format('YYYY-MM-DD HH:mm:SS')}</p>
                                        <p>{notice_hot.text.replace(/<[^>]+>/g, "").slice(0, 200)}</p>
                                    </div>
                                </div>

                                <div className="announcement-list">
                                    {list[0].map(item => (
                                        <p key={item.id}>
                                            <a href={`${config.CONTENT_DETAIL_URL}/${item.id}`}>{item.title}</a>
                                            <span>{moment(item.publish_at).format('YYYY-MM-DD')}</span>
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <Divider />
                            <Pagination showQuickJumper defaultPageSize={20} current={page ? page * 1 + 1 : 1} total={list[1]} onChange={this.onChange} />

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
