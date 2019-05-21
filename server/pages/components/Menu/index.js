import React from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const toRenderMenu = () => ({ siteInfo }) => {
    const { menus } = siteInfo;

    return (
        <div className="hdz-menu">
            {menus.sort((a, b) => a.sort - b.sort).map(menu => (
                <div className="menu-item" key={menu.id}>
                    <a href={menu.url ? menu.url : "javascript:;"}>
                        <i className="FDTG fdtg-home-l"></i>
                        <span className="menu-title">{menu.name}</span>
                    </a>
                    <div className="submenu">
                        {menu.children.sort((a, b) => a.sort - b.sort).map(submenu => (
                            <a href={submenu.url} key={submenu.id}> {submenu.name} </a>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )

}

export default () => {
    return (
        <GlobalContext.Consumer>
            {toRenderMenu()}
        </GlobalContext.Consumer>
    )
}


