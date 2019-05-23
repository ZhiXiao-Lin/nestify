import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const Article = ({ className, title, author, origin, publish, view, children }) => {
    const toRenderArticle = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className={`article-content ${className}`}>
                <div className={`article-title`}>
                    <p>{title}</p>
                    <p>
                        <span>作者：{author || '未知'}</span>
                        <span>来源：{origin || '未知'}</span>
                        <span>发布日期：{publish || '未知'}</span>
                        <span>查看次数：{view || '未知'}</span>
                    </p>
                </div>
                {children}
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderArticle()}
        </GlobalContext.Consumer>
    )
}

export default Article;
