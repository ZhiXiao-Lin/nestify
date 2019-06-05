import React, { Component } from 'react';
import { withRouter } from 'next/router';
import * as moment from 'moment';

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

    toGetMenuIndex = (menus, asPath) => {
        let path = asPath.split('?').shift().split('/').pop();
        let index = 0;
        let order = 0;
        menus.forEach((menu, i) => {
            if (menu.children && menu.children.length > 0) {
                menu.children.forEach((item, j) => {
                    if (path === item.url.split('/').pop()) {
                        index = i;
                        order = j;
                    }
                })
            }
        });
        return {
            menu_show: menus[index],
            order
        };
    }

    toRenderContent = ({ content }) => {
        return (
            <Article html={content.text} />
        )
    }

    toRenderList = ({ list }) => {
        return <SceneryList list={list} />
    }

    toRenderImage = ({ list }) => {
        return <ImageList list={list} />
    }

    toRenderVideo = ({ list }) => {
        return <VideoList list={list} />
    }

    toRenderImageDetail = ({ content }) => {
        return (
            <Article
                className="image-content"
                title={content.title}
                author={content.author}
                origin={content.source}
                publish={moment(content.publish_at).format('YYYY-MM-DD HH:mm:SS')}
                view={content.view}
                html={content.text}
            />
        )
    }

    toRenderVideoDetail = ({ content }) => {
        return (
            <div>
                <p>{content.title}</p>
                <video controls>
                    <source src={content.videoPath} />
                </video>
            </div>
        )
    }

    renderHandler = () => (options) => {
        const { siteInfo: { setting, menus }, type, router, parents } = options;
        const { menu_show, order } = this.toGetMenuIndex(menus, router.asPath);

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
                            <span>{parents ? '正文' : menu_show.children[order].name}</span>
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
