import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import './index.scss';

const Video = () => {
    const toRenderVideo = () => ({ video_list }) => {
        return (
            <div className="main-video">
                <p>视频赏析</p>
                <video controls autoPlay muted>
                    <source src={video_list[0][0].videoPath} />
                </video>
                <a href="/video/show"></a>
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
