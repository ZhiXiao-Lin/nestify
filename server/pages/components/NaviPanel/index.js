import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import './index.scss';

const NaviPanel = () => {
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
    const toRenderNaviPanel = () => ({ siteInfo, router, parents }) => {
        const { menus } = siteInfo;
        const { asPath } = router;
        let menu_category;
        if (parents) {
            menu_category = toGetMenuIndex(menus, parents.url);
        } else {
            menu_category = toGetMenuIndex(menus, asPath);
        }
        const { menu_show, order } = menu_category;

        return (
            <div className="navi-panel">
                <p className="navi-title">
                    <span>{menu_show.name}</span>
                </p>
                <div className="navi-list-container">
                    <div className="navi-list">
                        {menu_show.children.map((item, i) => (
                            <a key={i} href={item.url} className={`navi-item ${i === order ? 'active' : ''}`}>{item.name}</a>
                        ))}
                    </div>
                </div>
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderNaviPanel()}
        </GlobalContext.Consumer>
    )
}

export default NaviPanel;
