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
                            <span>特色工艺品</span>
                        </div>
                        <div className="main-content">

                            <Article
                                className="image-content"
                                title="休闲沙滩车"
                                author="admin"
                                origin="未知"
                                publish="2019-05-22"
                                view="225"
                            >
                                
                                <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                                <p>工艺品名称：休闲沙滩车</p>
                                <p>作者：刘逢开</p>
                                <p>单位：炼钢厂</p>

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
