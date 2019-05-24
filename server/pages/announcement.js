import React, { Component } from 'react';
import { withRouter } from 'next/router';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import Annoucement from './components/Annoucement';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';
import SceneryList from './components/SceneryList';

import config from './_config';

import './styles/introduction.scss';

@withRouter
export default class extends Component {
    renderHandler = () => ({ siteInfo }) => {
        const { setting } = siteInfo;

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
                                        <p>萍乡市委副书记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效</p>
                                        <p>2019-05-12</p>
                                        <p>5月6日上午，萍乡市委副书记、市长李江河莅临萍安钢铁调研指导工作，充分肯定该公司环境治理成效和国家3A级旅游景区建设工作，并要求按照国家标准，进一步提升企业环保水平。萍乡市政府秘书长兰叶子、市生态环境局局长李秋陪同调研。萍安钢铁领导黄智华、朱德强、梁建国热情接待。5月6日上午，萍乡市委副书记、市长李江河莅临萍安钢铁调研指导工作，充分肯定该公司环境治理成效和国家3A级旅游景区建设工作，并要求按照国家标准，进一步提升企业环保水平。萍乡市政府秘书长兰叶子、市生态环境局局长李秋陪同调研。萍安钢铁领导黄智华、朱德强、梁建国热情接待。</p>
                                    </div>
                                </div>

                                <div className="announcement-list">
                                    <p>
                                        <p><a href="javascript:;">方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</a></p>
                                        <span>2019-03-26</span>
                                    </p>
                                    <p>
                                        <p><a href="javascript:;">方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</a></p>
                                        <span>2019-03-26</span>
                                    </p>
                                    <p>
                                        <p><a href="javascript:;">方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</a></p>
                                        <span>2019-03-26</span>
                                    </p>
                                    <p>
                                        <p><a href="javascript:;">方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</a></p>
                                        <span>2019-03-26</span>
                                    </p>
                                </div>
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
