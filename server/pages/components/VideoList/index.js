import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const VideoList = () => {
    const toRenderVideoList = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className="video-list">
                <div className="video-item-container">
                    <div className="video-item">
                        <a href="javascript:;" className="external-link"></a>
                        <p>钢铁是怎样练成的</p>
                    </div>
                </div>
                <div className="video-item-container">
                    <div className="video-item">
                        <a href="javascript:;" className="external-link"></a>
                        <p>钢铁是怎样练成的</p>
                    </div>
                </div>
                <div className="video-item-container">
                    <div className="video-item">
                        <a href="javascript:;" className="external-link"></a>
                        <p>钢铁是怎样练成的</p>
                    </div>
                </div>
                <div className="video-item-container">
                    <div className="video-item">
                        <a href="javascript:;" className="external-link"></a>
                        <p>钢铁是怎样练成的</p>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderVideoList()}
        </GlobalContext.Consumer>
    )
}

export default VideoList;
