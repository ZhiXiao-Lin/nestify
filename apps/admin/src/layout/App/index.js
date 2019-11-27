
import React, { Component } from 'react';
import { /* Link, */ withRouter } from 'react-router-dom';
import cssModules from 'react-css-modules';
import { Layout, Icon, Menu, Dropdown, /* Avatar, */Tooltip } from 'antd';
import SiderMenu from 'layout/SiderMenu';
import loginUtil from 'util/login';
import styles from './style.less';

const { Header, Sider, Content } = Layout;

@withRouter
@cssModules(styles, {
  allowMultiple: true
})
class App extends Component {
  state = {
    collapsed: false
  };

  toggle = () => {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }

  handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      loginUtil.logout();
      this.props.history.push('/login');
    }
  }

  render() {
    const { collapsed } = this.state;

    const userInfo = loginUtil.getUserInfo() || {};

    const menu = (
      <Menu className="user-menu" selectedKeys={[]} onClick={this.handleMenuClick}>
        {/* <Menu.Item key="userCenter">
          <Link to="/"><Icon type="user" />个人中心</Link>
        </Menu.Item>
        <Menu.Item key="userinfo">
          <Link to="/"><Icon type="setting" />个人设置</Link>
        </Menu.Item>
        <Menu.Divider /> */}
        <Menu.Item key="logout">
          <Icon type="logout" />
          退出登录
        </Menu.Item>
      </Menu>
    );

    return (
      <Layout>
        <Sider
          trigger={null}
          collapsible
          width={256}
          collapsed={this.state.collapsed}
        >
          <div styleName="logo">
            <img src="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg" alt="logo" />
            <h1>{collapsed ? '' : 'Ant Design Pro'}</h1>
          </div>
          <SiderMenu collapsed={collapsed} />
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: 0 }}>
            <Icon
              styleName="icon-menu-trigger"
              type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'}
              onClick={this.toggle}
            />
            <div styleName="right">
              <Tooltip title="使用文档">
                <a
                  target="_blank"
                  href="https://pro.ant.design/docs/getting-started"
                  rel="noopener noreferrer"
                  styleName="action"
                  title="使用文档"
                >
                  <Icon type="question-circle-o" />
                </a>
              </Tooltip>
              <Dropdown overlay={menu}>
                <span styleName="action account">
                  {/* <Avatar
                    size="small"
                    styleName="avatar"
                    // src={userInfo.avatar}
                    // src="https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png"
                    alt="avatar"
                  /> */}
                  <span styleName="avatar">{userInfo.name}</span>
                </span>
              </Dropdown>
            </div>
          </Header>
          <Content>
            {this.props.children}
          </Content>
        </Layout>
      </Layout>
    );
  }
}

export default App;
