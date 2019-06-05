import React, { useState } from 'react';
import { Pagination, Divider } from 'antd';
import * as moment from 'moment';
import GlobalContext from '../../contexts/GlobalContext';
import config from '../../_config';

import './index.scss';

const List = ({ list, has_date }) => {
    const onChange = (page) => {
        window.location.href = `${window.location.pathname}?page=${page-1}`;
    }
    const toRenderList = () => ({ router }) => {
        let { page } = router.query;
        return (
            <div className="scenery-view">
                {list[0].map(item => (
                    <div className="scenery-item-container" key={item.id}>
                        <div className="scenery-item">
                            <div className="scenery-image">
                                <img src={item.thumbnailPath} alt='PIC' />
                            </div>
                            <div className="scenery-intro">
                                <p>{item.title}</p>
                                <p>{has_date ? moment(item.publish_at).format('YYYY-MM-DD HH:mm:SS') : ''}</p>
                                <p className={has_date && 'txt-hide-2'}>{item.text.replace(/<[^>]+>/g, "")}</p>
                                <p>
                                    <a href={`${config.CONTENT_DETAIL_URL}/${item.id}`} className="scenery-detail"> 详情 >> </a>
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                <Divider />
                <Pagination showQuickJumper defaultPageSize={10} current={page ? page*1+1 : 1} total={list[1]} onChange={onChange} />
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderList()}
        </GlobalContext.Consumer>
    )
}

export default List;
