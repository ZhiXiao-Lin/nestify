import React, { Component } from 'react';

import { Menu, Icon } from 'antd';

const { SubMenu, Divider } = Menu;

class SlideMenu extends Component {
    constructor(props) {
        super(props);
        this.state = {
            menuData: [
                {
                    iconType: 'edit',
                    text: '写文章',
                    linkPath: 'editor/drafts/new'
                },
                {
                    iconType: 'copy',
                    text: '草稿',
                    linkPath: 'editor/drafts'
                },
                {
                    type: 'line',
                    key: '1'
                },
                {
                    iconType: 'user',
                    text: '我的主页',
                    linkPath: 'user/:userId'
                },
                {
                    iconType: 'like',
                    text: '我赞过的',
                    linkPath: 'user/:userId/likes'
                },
                {
                    iconType: 'star',
                    text: '我的收藏集',
                    linkPath: 'user/:userId/collections'
                },
                {
                    iconType: 'shopping-cart',
                    text: '已购',
                    linkPath: 'user/:userId/books?type=bought'
                },
                {
                    iconType: 'tags',
                    text: '标签管理',
                    linkPath: 'subscribe/subscribed'
                },
                {
                    type: 'line',
                    key: '2'
                },
                {
                    iconType: 'setting',
                    text: '设置',
                    linkPath: 'user/settings/profile'
                },
                {
                    iconType: 'info-circle',
                    text: '关于',
                    subMenu: [
                        //'下载应用','关于','加入我们','翻译计划','合作伙伴'
                        {
                            text: '下载应用',
                            linkPath: 'app'
                        },
                        {
                            text: '关于',
                            linkPath: 'about'
                        },
                        {
                            text: '加入我们',
                            linkPath: 'jobs'
                        },
                        {
                            text: '翻译计划',
                            linkPath: 'gold-miner'
                        },
                        {
                            text: '合作伙伴',
                            linkPath: 'parner'
                        }
                    ]
                },
                {
                    type: 'line',
                    key: '3'
                },
                {
                    iconType: 'export',
                    text: '登出',
                    linkPath: 'logout'
                }
            ]
        };
    }
    handleClick = (e) => {
        //console.log('用户id'+this.props.userId);
        //console.log('click', e.keyPath[0])
        if (e.keyPath[0] === 'logout') {
            this.props.logout();
            window.location.href = '/';
        } else {
            window.location.href = '/' + e.keyPath[0];
        }
    };
    renderMenu = (menu) => {
        if ('line' === menu.type) {
            return <Divider key={menu.key} />;
        }

        return menu.subMenu && menu.subMenu.length !== 0 ? (
            <SubMenu
                key={menu.text}
                title={
                    <span>
                        <Icon type={menu.iconType} />
                        <span>{menu.text}</span>
                    </span>
                }
            >
                {menu.subMenu.map((subItem) => {
                    return <Menu.Item key={subItem.linkPath}>{subItem.text}</Menu.Item>;
                })}
            </SubMenu>
        ) : (
            <Menu.Item key={menu.linkPath}>
                <Icon type={menu.iconType} />
                {menu.text}
            </Menu.Item>
        );
    };
    render() {
        return (
            <div>
                <Menu
                    onClick={this.handleClick.bind(this)}
                    style={{ width: 130, border: 'none' }}
                    mode="vertical"
                >
                    {this.state.menuData.map((item, index) => this.renderMenu(item))}
                </Menu>
            </div>
        );
    }
}

export default SlideMenu;
