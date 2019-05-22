import React, { Component } from 'react';
import { withRouter } from 'next/router';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import Annoucement from './components/Annoucement';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';
import Video from './components/Video';

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
                            <span>工艺介绍</span>
                        </div>
                        <div className="main-content">
                            <div className="video-list">
                                <div className="video-item-container">
                                    <div className="video-item">
                                        <a href="javascript:;" className="external-link"></a>
                                        <p>钢铁是怎样练成的</p>
                                    </div>
                                </div>
                                <div className="video-item-container">
                                    <div className="video-item">
                                        <a href="javascript:;" className="external-link"></a>
                                        <p>钢铁是怎样练成的</p>
                                    </div>
                                </div>
                                <div className="video-item-container">
                                    <div className="video-item">
                                        <a href="javascript:;" className="external-link"></a>
                                        <p>钢铁是怎样练成的</p>
                                    </div>
                                </div>
                                <div className="video-item-container">
                                    <div className="video-item">
                                        <a href="javascript:;" className="external-link"></a>
                                        <p>钢铁是怎样练成的</p>
                                    </div>
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
