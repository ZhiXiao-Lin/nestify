import React, { useState } from 'react';
import { Pagination, Divider } from 'antd';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const ImageList = ({ list }) => {

    const toRenderImageList = () => ({ router }) => {
        const onChange = (page) => {
            window.location.href = `${window.location.pathname}?page=${page - 1}`;
        }
        let { query: { page }, asPath } = router;
        
        return (
            <div className="image-list">
                {list[0].map(item => (
                    <div className="image-item-container" key={item.id}>
                        <a href={`${asPath.split('?').shift()}/${item.id}`} className="image-item">
                            <img src={item.thumbnail} alt='PIC' />
                            <p>{item.title}</p>
                        </a>
                    </div>
                ))}
                <Divider />
                <Pagination showQuickJumper defaultPageSize={12} current={page ? page * 1 + 1 : 1} total={list[1]} onChange={onChange} />
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderImageList()}
        </GlobalContext.Consumer>
    )
}

export default ImageList;
