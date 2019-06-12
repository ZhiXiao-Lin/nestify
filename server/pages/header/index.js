import React, { Component } from 'react';
import { Affix, Input, Menu, Dropdown, Button, Icon, message, Badge, Avatar, Popover } from 'antd';
import Nav from './nav';
import './header.less';
import SlideMenu from './SlideMenu';

class Header extends Component {
    constructor(props) {
        super(props);
        this.state = {
            top: 0
        };
    }
    handleMenuClick(e) {
        message.info('Click on menu item.');
        console.log('click', e.key);
    }

    render() {
        const Search = Input.Search;
        const menu = (
            <Menu onClick={this.handleMenuClick}>
                <Menu.Item key="1">发布沸点</Menu.Item>
                <Menu.Item key="2">分享链接</Menu.Item>
            </Menu>
        );
        const isLogin = this.props.userName !== '' ? true : false;
        return (
            <Affix offsetTop={this.state.top}>
                <div className="pageHeader">
                    <div className="container">
                        <a href="/" className="logo">
                            <img
                                src="//b-gold-cdn.xitu.io/v3/static/img/logo.a7995ad.svg"
                                alt="掘金"
                                className="logo-img"
                            />
                        </a>
                        <nav className="main-nav">
                            <Nav />
                            <Search
                                placeholder="搜索更新啦"
                                onSearch={(value) => console.log(value)}
                                style={{ width: 200 }}
                            />
                            <Dropdown overlay={menu}>
                                <Button>
                                    写文章 <Icon type="down" />
                                </Button>
                            </Dropdown>
                            <Badge count={this.props.count} overflowCount={10}>
                                <a href="/">
                                    <Icon type="notification" />
                                </a>
                            </Badge>
                            {isLogin ? (
                                <Popover
                                    placement="bottomRight"
                                    content={<SlideMenu userId={this.props.userId} />}
                                    trigger="click"
                                >
                                    <Avatar
                                        icon="user"
                                        src={this.props.userImage}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </Popover>
                            ) : (
                                <div>
                                    <span
                                        className="login"
                                        onClick={() => this.props.handlelogin()}
                                    >
                                        登录
                                    </span>
                                    <span className="register">注册</span>
                                </div>
                            )}
                        </nav>
                    </div>
                </div>
            </Affix>
        );
    }
}

export default Header;
