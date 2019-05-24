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
                            <span>景区介绍</span>
                        </div>
                        <div className="main-content">

                            <div className="concact-view">
                                <div className="concat-info">
                                    <p>方大特钢工业旅游</p>
                                    <p><i className="FDTG fdtg-phone"></i>电话：0791-86753021</p>
                                    <p><i className="FDTG fdtg-dayinchuanzhen"></i>传真：0791-86753021</p>
                                    <p><i className="FDTG fdtg-icon--"></i>邮编：330038</p>
                                    <p><i className="FDTG fdtg-zuobiao"></i>地址：南昌市红谷滩新区凤凰中大道890号</p>
                                </div>
                                <a href="https://ditu.amap.com/search?query=%E5%8D%97%E6%98%8C%E5%B8%82%E7%BA%A2%E8%B0%B7%E6%BB%A9%E6%96%B0%E5%8C%BA%E5%87%A4%E5%87%B0%E4%B8%AD%E5%A4%A7%E9%81%93890%E5%8F%B7&city=360100&geoobj=115.784004%7C28.534979%7C116.110161%7C28.823832&zoom=12" target="_blank">
                                    <img src={`${config.STATIC_IMAGE_ROOT}/map.png`} alt='placeholder+image' />
                                </a>
                                <div className="concact-address">
                                    <div className="address-1">
                                        <p>方大特钢科技股份有限公司</p>
                                        <p>电话：0791-88392816</p>
                                        <p>传真：0791-88392848</p>
                                        <p>销售：0791-88396518</p>
                                        <p>地址：江西省南昌市青山湖区冶金大道475号</p>
                                        <p>邮编：330012</p>
                                    </div>
                                    <div className="address-2">
                                        <p>方大特钢科技股份有限公司</p>
                                        <p>电话：0791-88392816</p>
                                        <p>传真：0791-88392848</p>
                                        <p>销售：0791-88396518</p>
                                        <p>地址：江西省南昌市青山湖区冶金大道475号</p>
                                        <p>邮编：330012</p>
                                    </div>
                                    <div className="address-3">
                                        <p>方大特钢科技股份有限公司</p>
                                        <p>电话：0791-88392816</p>
                                        <p>传真：0791-88392848</p>
                                        <p>销售：0791-88396518</p>
                                        <p>地址：江西省南昌市青山湖区冶金大道475号</p>
                                        <p>邮编：330012</p>
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
