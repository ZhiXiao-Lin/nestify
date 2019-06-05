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
    renderHandler = () => ({ siteInfo, list }) => {
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
                            <span>联系方式</span>
                        </div>
                        <div className="main-content">

                            <div className="concact-view">
                                <div className="concat-info">
                                    <p>方大特钢工业旅游</p>
                                    <p><i className="FDTG fdtg-phone"></i>电话：{list[0][0].ex_info && list[0][0].ex_info.phone}</p>
                                    <p><i className="FDTG fdtg-dayinchuanzhen"></i>传真：{list[0][0].ex_info && list[0][0].ex_info.fax}</p>
                                    <p><i className="FDTG fdtg-icon--"></i>邮编：{list[0][0].ex_info && list[0][0].ex_info.postcode}</p>
                                    <p><i className="FDTG fdtg-zuobiao"></i>地址：{list[0][0].ex_info && list[0][0].ex_info.address}</p>
                                </div>
                                <a href="https://ditu.amap.com/place/B03170SZN4" target="_blank">
                                    <img src={`${config.STATIC_IMAGE_ROOT}/map.png`} alt='placeholder+image' />
                                </a>
                                <div className="concact-address">
                                    {list[0].map((item, i) => {
                                        if (item.ex_info) {
                                            return (
                                                <div className={`address-${i}`} key={i}>
                                                    <p>{item.ex_info.company}</p>
                                                    <p>电话：{item.ex_info.phone}</p>
                                                    <p>传真：{item.ex_info.fax}</p>
                                                    <p>销售：{item.ex_info.sale}</p>
                                                    <p>地址：{item.ex_info.address}</p>
                                                    <p>邮编：{item.ex_info.postcode}</p>
                                                </div>
                                            )
                                        }
                                    })}
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
