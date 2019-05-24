import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const NaviPanel = () => {
    const toRenderNaviPanel = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className="navi-panel">
                <p className="navi-title">
                    <span>景区概况</span>
                </p>
                <div className="navi-list-container">
                    <div className="navi-list">
                        <a href="javascript:;" className="navi-item active">景区介绍</a>
                        <a href="javascript:;" className="navi-item">地理概况</a>
                        <a href="javascript:;" className="navi-item">工艺特色</a>
                        <a href="javascript:;" className="navi-item">人文历史</a>
                        <a href="javascript:;" className="navi-item">发展规划</a>
                        <a href="javascript:;" className="navi-item">当地特产</a>
                        <a href="javascript:;" className="navi-item">特色工艺品</a>
                        <a href="javascript:;" className="navi-item">游览须知</a>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderNaviPanel()}
        </GlobalContext.Consumer>
    )
}

export default NaviPanel;
