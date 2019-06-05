import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';
import { Pagination, Divider } from 'antd';

import config from '../../_config';

import './index.scss';

const VideoList = ({ list }) => {
    const onChange = (page) => {
        window.location.href = `${window.location.pathname}?page=${page - 1}`;
    }
    const toRenderVideoList = () => ({ router }) => {
        let { query: { page }, asPath } = router;

        return (
            <div className="video-list">
                {list[0].map(item => (
                    <div className="video-item-container" key={item.id}>
                        <div className="video-item">
                            <a href={`${asPath.split('?').shift()}?id=${item.id}`} className="external-link"></a>
                            <p>{item.title}</p>
                        </div>
                    </div>
                ))}
                <Divider />
                <Pagination showQuickJumper defaultPageSize={12} current={page ? page * 1 + 1 : 1} total={list[1]} onChange={onChange} />
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
