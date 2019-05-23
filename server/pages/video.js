import React, { Component } from 'react';
import { withRouter } from 'next/router';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import Annoucement from './components/Annoucement';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';
import Article from './components/Article';

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
                            <span>工艺特色</span>
                        </div>
                        <div className="main-content">
                            <Article 
                                className="video-content"
                                title="方大特钢工业旅游——钢铁是怎样炼成的"
                                author="admin"
                                origin="未知"
                                publish="2019-05-22"
                                view="225"
                            >
                                <video controls>
                                    <source src="/static/video/AngryBird.mp4" />
                                </video>
                            </Article>
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
