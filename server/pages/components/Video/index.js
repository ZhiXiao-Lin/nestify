import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const Video = () => {
    const toRenderVideo = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className="main-video">
                <p>视频赏析</p>
                <video controls autoPlay muted>
                    <source src="/static/root/video/AngryBird.mp4" />
                </video>
                <a href="javascript:;"></a>
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderVideo()}
        </GlobalContext.Consumer>
    )
}

export default Video;
