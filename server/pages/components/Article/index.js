import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

/*
    className="image-content"
    title="休闲沙滩车"
    author="admin"
    origin="未知"
    publish="2019-05-22"
    view="225"
    prevPage=["aaaa", "javascript:;"]
    nextPage-["bbbb", "javascript:;"]
*/

const Article = ({ className, title, author, origin, publish, view, children, prevPage, nextPage }) => {
    const flipFlag = prevPage || nextPage;
    const toRenderArticle = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <>
                <div className={`article-content ${className}`}>
                    {title && (
                        <div className={`article-title`}>
                            <p>{title}</p>
                            <p>
                                <span>作者：{author || '未知'}</span>
                                <span>来源：{origin || '未知'}</span>
                                <span>发布日期：{publish || '未知'}</span>
                                <span>查看次数：{view || '未知'}</span>
                            </p>
                        </div>
                    )}
                    {children}
                </div>
                {flipFlag && (
                    <>
                        <div className="article-divider-horizental"></div>
                        <div className="article-flipping-page">
                            {prevPage && <a href="javascript:;" className="prev-article">上一章：aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</a>}
                            {nextPage && <a href="javascript:;" className="next-article">下一章：bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb</a>}
                        </div>
                    </>
                )}
            </>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderArticle()}
        </GlobalContext.Consumer>
    )
}

export default Article;
