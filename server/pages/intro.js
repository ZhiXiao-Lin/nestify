import React, { Component } from 'react';
import { withRouter } from 'next/router';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';
import ImageList from './components/ImageList';
import VideoList from './components/VideoList';
import SceneryList from './components/SceneryList';
import Article from './components/Article';

import config from './_config';

import './styles/introduction.scss';

@withRouter
export default class extends Component {
    constructor(props) {
        super(props)
        this.renderBy = {
            content: this.toRenderContent,
            list: this.toRenderList,
            image: this.toRenderImage,
            video: this.toRenderVideo,
            imageDetail: this.toRenderImageDetail,
            videoDetail: this.toRenderVideoDetail,
        }
    }

    toRenderContent = ({ html }) => {
        return (
            <Article html={html} />
        )
    }

    toRenderList = () => {
        return <SceneryList />
    }

    toRenderImage = () => {
        return <ImageList />
    }

    toRenderVideo = () => {
        return <VideoList />
    }

    toRenderImageDetail = () => {
        return (
            <Article
                className="image-content"
                title="休闲沙滩车"
                author="admin"
                origin="未知"
                publish="2019-05-22"
                view="225"
                html={`
                    <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                    <p>工艺品名称：休闲沙滩车</p>
                    <p>作者：刘逢开</p>
                    <p>单位：炼钢厂</p>
                `}
            />
        )
    }

    toRenderVideoDetail = () => {
        return (
            <video controls>
                <source src="/static/root/video/AngryBird.mp4" />
            </video>
        )
    }

    renderHandler = () => (options) => {
        const { siteInfo: { setting }, type } = options;

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
                            <span>景区介绍</span>
                        </div>
                        <div className={`main-content ${type}-content`}>

                            {this.renderBy[type](options)}

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
