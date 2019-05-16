import React from 'react';

import config from '../../_config';

import './index.scss';

export default () => {
    return (
        <div className="hdz-header-body">
            <p className="head-top">
                <span>国家AAAA级景区</span>
                <span>生态森林旅游式工厂 —— 方大特钢欢迎您！</span>
                <span className="divider"></span>
                <span>
                    <i className="FDTG fdtg-phone"></i> 
                </span>
                <span> 0718-7262455 </span>
                <span className="divider"></span>
                <span className="head-wechat">
                    <i className="FDTG fdtg-wechat"></i>
                    <span className="head-qrcode">
                        <img src='http://dummyimage.com/400x400/4d494d/686a82.gif&text=QRCode' alt='QRCode' />
                        <p>微信二维码</p>
                    </span>
                </span>
                <span className="head-weibo">
                    <i className="FDTG fdtg-weibo"></i>
                    <span className="head-qrcode">
                        <img src='http://dummyimage.com/400x400/4d494d/686a82.gif&text=QRCode' alt='QRCode' />
                        <p>微博二维码</p>
                    </span>
                </span>
                <span className="order-ticket">在线预定</span>
            </p>
            div
        </div>
    )
    
}