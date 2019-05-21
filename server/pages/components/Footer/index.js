import React from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const toRenderFooter = () => ({ siteInfo }) => {
    const { setting, links } = siteInfo;
    
    return (
        <>
            <div className="footer">
                <div className="footer-content d-f">
                    <div className="content-1">
                        <div className="footer-logo">
                            <img alt="" src={`${config.STATIC_IMAGE_ROOT}/static/banner_title.png`} />
                        </div>
                        <div className="concat-list d-f">
                            <div className="left">
                                <i className="FDTG fdtg-service fs-40"></i>
                            </div>
                            <div className="right fs-14">
                                <div className="concat-1">景区服务热线：<span className="fs-30">{setting.serviceHotline}</span></div>
                                <div className="concat-2">〔景区地址〕{setting.address}</div>
                                <div className="concat-3">〔邮政编码〕{setting.postcode}</div>
                                <div className="concat-4">〔售票热线〕{setting.bookingHotline}</div>
                                <div className="concat-5">〔传真号码〕{setting.fax}</div>
                            </div>
                        </div>
                        <div className="concat-link d-f">
                            <i className="FDTG fdtg-service fs-40"></i>
                            <i className="FDTG fdtg-service fs-40"></i>
                            <i className="FDTG fdtg-service fs-40"></i>
                            <i className="FDTG fdtg-service fs-40"></i>
                            <i className="FDTG fdtg-service fs-40"></i>
                        </div>
                    </div>
                    <div className="content-2">
                        <div className="wechat">
                            <img src={setting.wechat} alt="" />
                            <p>扫码关注</p>
                            <p>方大特钢官方微信公众号</p>
                        </div>
                        <div className="weibo">
                            <img src={setting.weibo} alt="" />
                            <p>扫码关注</p>
                            <p>方大特钢官方微博</p>
                        </div>
                    </div>
                    <div className="content-3 d-f">
                        <p className="f-FZLTHJW fs-24">网站导航</p>
                        <p><a href={`${config.HOME_URL}`}>网站首页</a></p>
                        <p><a href={`${config.HOME_URL}`}>景区概况</a></p>
                        <p><a href={`${config.HOME_URL}`}>景区风光</a></p>
                        <p><a href={`${config.HOME_URL}`}>旅游攻略</a></p>
                        <p><a href={`${config.HOME_URL}`}>景区动态</a></p>
                        <p><a href={`${config.HOME_URL}`}>集团官网</a></p>
                        <p><a href={`${config.HOME_URL}`}>联系我们</a></p>
                    </div>
                    <div className="content-4 d-f">
                        <p className="f-FZLTHJW fs-24">友情链接</p>
                        {links.map((item, i) => (
                            <p><a href={item.url}>{item.title}</a></p>
                        ))}
                    </div>
                </div>
            </div>

            <div className="copyright fs-12">{setting.copyright} | {setting.icp} | 技术支持：{setting.techSupport}</div>
        </>
    )
}

export default () => {
    return (
        <GlobalContext.Consumer>
            {toRenderFooter()}
        </GlobalContext.Consumer>
    )
}