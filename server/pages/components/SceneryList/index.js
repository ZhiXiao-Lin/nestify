import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const Video = () => {
    const toRenderVideo = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className="scenery-view">
                <div className="scenery-item-container">
                    <div className="scenery-item">
                        <div className="scenery-image">
                            <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                        </div>
                        <div className="scenery-intro">
                            <p>文化景观墙</p>
                            <p>长约425米的文化景观墙，形成一部铁色画卷，整体展开为企业理念、发展轨迹、铁色记忆和工艺流程四个篇章。主题铸铜浮雕15幅，写意表达企业发展场景；发展轨迹以历史齿轮连贯历经半个世纪企业的重大历史事件长约425米的文化景观墙，形成一部铁色画卷，整体展开为企业理念、发展轨迹、铁色记忆和工艺流程四个篇章。主题铸铜浮雕15幅，写意表达企业发展场景；发展轨迹以历史齿轮连贯历经半个世纪企业的重大历史事件</p>
                            <p>
                                <a href="javascript:;" className="scenery-detail"> 详情 >> </a>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="scenery-item-container">
                    <div className="scenery-item">
                        <div className="scenery-image">
                            <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                        </div>
                        <div className="scenery-intro">
                            <p>文化景观墙</p>
                            <p>长约425米的文化景观墙，形成一部铁色画卷，整体展开为企业理念、发展轨迹、铁色记忆和工艺流程四个篇章。主题铸铜浮雕15幅，写意表达企业发展场景；发展轨迹以历史齿轮连贯历经半个世纪企业的重大历史事件长约425米的文化景观墙，形成一部铁色画卷，整体展开为企业理念、发展轨迹、铁色记忆和工艺流程四个篇章。主题铸铜浮雕15幅，写意表达企业发展场景；发展轨迹以历史齿轮连贯历经半个世纪企业的重大历史事件</p>
                            <p>
                                <a href="javascript:;" className="scenery-detail"> 详情 >> </a>
                            </p>
                        </div>
                    </div>
                </div>
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
