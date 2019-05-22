import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const News = () => {
    const [ current, toSetCurrent ] = useState(1);
    const toRenderNews = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className="main-news">
                <div className="news-tab">
                    <a href="javascript:;" className={`${current === 1 ? 'active' : ''}`} onClick={() => { toSetCurrent(1) }}>精彩活动</a>
                    <a href="javascript:;" className={`${current === 2 ? 'active' : ''}`} onClick={() => { toSetCurrent(2) }}>新闻动态</a>
                    <a href="javascript:;">更多</a>
                </div>
                <div className="news-hot">
                    <p>方大特钢：员工“获得感”彰显企业含金量</p>
                    <p>以员工对美好生活的向往为企业的奋斗目标，让改革催动以员工对美好生活的向往为企业的奋斗目标，让改革催动以员工对美好生活的向往为企业的奋斗目标，让改革催动</p>
                </div>
                <div className="news-list">
                    <p>
                        <p><a href="javascript:;">方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</a></p>
                        <span>2019-03-26</span>
                    </p>
                    <p>
                        <p><a href="javascript:;">方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</a></p>
                        <span>2019-03-26</span>
                    </p>
                    <p>
                        <p><a href="javascript:;">方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</a></p>
                        <span>2019-03-26</span>
                    </p>
                    <p>
                        <p><a href="javascript:;">方大钢铁集团全面开展安全生产隐患排查方大钢铁集团全面开展安全生产隐患排查</a></p>
                        <span>2019-03-26</span>
                    </p>
                </div>
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderNews()}
        </GlobalContext.Consumer>
    )
}

export default News;
