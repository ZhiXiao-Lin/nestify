import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const BreadCrumbs = () => {
    const toGetMenuIndex = (menus, asPath) => {
        let path = asPath.split('?').shift().split('/').pop();
        let index = 0;
        let order = 0;
        menus.forEach((menu, i) => {
            if (menu.children && menu.children.length > 0) {
                menu.children.forEach((item, j) => {
                    if (path === item.url.split('/').pop()) {
                        index = i;
                        order = j;
                    }
                })
            }
        });
        return {
            menu_show: menus[index],
            order
        };
    }
    const toRenderBreadCrumbs = () => ({ siteInfo, router, parents }) => {
        const { menus } = siteInfo;
        const { asPath } = router;
        
        let bread_crumbs;
        if (parents) {
            const { menu_show: { name, children }, order } = toGetMenuIndex(menus, parents.url);
            bread_crumbs = [
                name,
                children.map(child => child.name)[order],
                '正文'
            ];
        } else {
            const { menu_show: { name, children }, order } = toGetMenuIndex(menus, asPath);
            bread_crumbs = [
                name,
                children.map(child => child.name)[order]
            ];
        }
        
        return (
            <div className="bread-crumbs">
                <p>
                    <span>您当前所在的位置：</span>
                    <span>首页</span>
                    {bread_crumbs.map(item => <span key={item}>{item}</span>)}
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
