import React from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const toRenderHeader = () => ({ siteInfo }) => {
    const { setting } = siteInfo;

    return (
        <div className="hdz-header-body">
            <p className="head-top">
                <span>国家AAAA级景区</span>
                <span>生态森林旅游式工厂 —— 方大特钢欢迎您！</span>
                <span className="divider"></span>
                <span>
                    <i className="FDTG fdtg-phone"></i> 
                </span>
                <span> {setting.bookingHotline} </span>
                <span className="divider"></span>
                <span className="head-wechat">
                    <i className="FDTG fdtg-wechat"></i>
                    <span className="head-qrcode">
                        <img src={setting.wechat} />
                        <span>微信二维码</span>
                    </span>
                </span>
                <span className="head-weibo">
                    <i className="FDTG fdtg-weibo"></i>
                    <span className="head-qrcode">
                        <img src={setting.weibo} />
                        <span>微博二维码</span>
                    </span>
                </span>
                <a href={setting.onlineSaleUrl} className="order-ticket">在线预定</a>
            </p>
            <div className="head-title">
                <img src={`${config.STATIC_IMAGE_ROOT}/banner_title.png`} alt='banner' />
                <img src={`${config.STATIC_IMAGE_ROOT}/banner_slogan.png`} alt='banner' />
            </div>
        </div>
    )
    
}

export default () => {
    return (
        <GlobalContext.Consumer>
            {toRenderHeader()}
        </GlobalContext.Consumer>
    )
}