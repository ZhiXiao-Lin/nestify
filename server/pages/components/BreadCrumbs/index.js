import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const BreadCrumbs = () => {
    const toRenderBreadCrumbs = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className="bread-crumbs">
                <p>
                    <span>您当前所在的位置：</span>
                    <span>首页</span>
                    <span>景区概况</span>
                    <span>景区介绍</span>
                </p>
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderBreadCrumbs()}
        </GlobalContext.Consumer>
    )
}

export default BreadCrumbs;
