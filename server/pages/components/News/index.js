import React, { useState } from 'react';
import * as moment from 'moment';
import config from '../../_config';

import './index.scss';

const News = ({ news, activity }) => {

    const news_hot = news[0];
    const activity_hot = activity[0];
    const news_list_body = news.slice(1);
    const activity_list_body = activity.slice(1);

    const [thisState, thisSetState] = useState({
        current: 1,
        hot: activity_hot,
        list: activity_list_body
    });

    const onChangeTag = (current) => () => {
        if (current === 1) {
            thisSetState({
                current: current,
                hot: activity_hot,
                list: activity_list_body
            })
        } else {
            thisSetState({
                current: current,
                hot: news_hot,
                list: news_list_body
            })
        }
    }

    return (
        <div className="main-news">
            <div className="news-tab">
                <a href="javascript:;" className={`${thisState.current === 1 ? 'active' : ''}`} onClick={onChangeTag(1)}>精彩活动</a>
                <a href="javascript:;" className={`${thisState.current === 2 ? 'active' : ''}`} onClick={onChangeTag(2)}>新闻动态</a>
                <a href={thisState.current === 1 ? `/list/activities` : `/list/news`}>更多</a>
            </div>
            <div className="news-hot">
                <p>{thisState.hot.title}</p>
                <p>{thisState.hot.text && thisState.hot.text.replace(/<[^>]+>/g, "").slice(0, 50)}</p>
            </div>
            <div className="news-list">
                {thisState.list.map(item => (
                    <p key={item.id}>
                        <a href={`${config.CONTENT_DETAIL_URL}/${item.id}`}>{item.title}</a>
                        <span>{moment(item.publish_at).format('YYYY-MM-DD')}</span>
                    </p>
                ))}
            </div>
        </div>
    )
}

export default News;
