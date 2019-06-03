import React, { Fragment, PureComponent } from 'react';
import { connect } from 'dva';
import { Layout, Menu, BackTop, Icon, Spin } from 'antd';
import _ from 'lodash';
import Link from 'umi/link';
import router from 'umi/router';
import DocumentTitle from 'react-document-title';
import config from '@/config';

import GlobalHeader from '@/components/GlobalHeader';
import GlobalFooter from '@/components/GlobalFooter';

import logo from '../assets/logo.svg';
import styles from './studio.less';

const { Header, Content, Footer, Sider } = Layout;

const MenuLoop = (authorities, role, menulist) => {
  const roleAuthorities = '0b' + role.authorities;

  return menulist
    .filter((item) => !!item.name && !!item.path)
    .map((item) => {
      // if (item.notLeftMenu) return;
      /* Todo: fix bug !!!
		if (!!item.authority) {
			const itemAuthorities = _.find(authorities, (val) => val.name === item.authority);

			// console.log(roleAuthorities, item.name, item.authority, authorities, itemAuthorities);

			if (!itemAuthorities || !itemAuthorities.authority) return;
			// console.log(
			// 	roleAuthorities,
			// 	item.name,
			// 	'0b' + itemAuthorities.authority,
			// 	roleAuthorities & ('0b' + itemAuthorities.authority)
			// );

			if ((roleAuthorities & ('0b' + itemAuthorities.authority)) <= 0) return;
		}
		*/
      if (!!item.routes && item.routes.length > 0) {
        return (
          <Menu.SubMenu
            key={item.path}
            title={
              <span>
                <Icon type={item.icon} />
                <span>{item.name}</span>
              </span>
            }
          >
            {MenuLoop(authorities, role, item.routes)}
          </Menu.SubMenu>
        );
      } else {
        return (
          <Menu.Item key={item.path}>
            <Link to={item.path}>
              {!item.icon ? null : <Icon type={item.icon} />}
              <span>{item.name}</span>
            </Link>
          </Menu.Item>
        );
      }
    });
};

const StudioMenu = ({ authorities, role, items, collapsed, mode, theme }) => (
  <Menu
    theme={theme || 'dark'}
    mode={mode || 'inline'}
    inlineCollapsed={mode !== 'horizontal' && collapsed}
  >
    {MenuLoop(authorities, role, items)}
  </Menu>
);

@connect(({ global, user, authorities }) => ({
  loading: global.loading,
  collapsed: global.collapsed,
  menuLayout: global.menuLayout,
  currentUser: user.currentUser,
  authorities: [],
  noticesList: [],
}))
export default class StudioLayout extends PureComponent {
  handleMenuCollapse = (collapsed) => {
    const { dispatch } = this.props;
    dispatch({
      type: 'global/changeLayoutCollapsed',
      payload: collapsed,
    });
  };

  handleHeaderMenuClick = (menu) => {
    const { dispatch } = this.props;
    switch (menu.key) {
      // case 'userCenter':
      // 	router.push(gUrlUserCenter);
      // 	return;
      case 'userinfo':
        router.push('/studio/user/setting');
        return;
      case 'logout':
        dispatch({
          type: 'user/logout',
        });
        return;
      default:
        break;
    }
  };

  render() {
    const {
      children,
      collapsed,
      currentUser,
      authorities,
      noticesList,
      loading,
      menuLayout,
    } = this.props;
    const { routes } = this.props.route;

    if (!currentUser) return null;

    const role = currentUser.role || {};

    return (
      <DocumentTitle title={config.TITLE}>
        <Layout>
          {menuLayout === 'sidemenu' && (
            <Sider className={styles.siderMenu} collapsed={collapsed}>
              {
                <div className={styles.logo} id="logo">
                  <Link to={'/'}>
                    <img src={logo} alt="logo" />
                    <h1>{config.TITLE}</h1>
                  </Link>
                </div>
              }
              <StudioMenu
                authorities={authorities}
                role={role}
                items={routes}
                collapsed={collapsed}
                mode="inline"
              />
            </Sider>
          )}
          <Layout
            className={`${menuLayout === 'sidemenu' && styles.mainLayout} ${
              collapsed && menuLayout === 'sidemenu' ? styles.layoutCollapsed : ''
              }`}
          >
            <Header className={styles.header}>
              <GlobalHeader
                menu={
                  <StudioMenu
                    authorities={authorities}
                    role={role}
                    items={routes}
                    collapsed={collapsed}
                    mode="horizontal"
                    theme="light"
                  />
                }
                menuLayout={menuLayout}
                notices={noticesList}
                currentUser={currentUser}
                onCollapse={this.handleMenuCollapse}
                collapsed={collapsed}
                onMenuClick={this.handleHeaderMenuClick}
              />
            </Header>

            <Spin size="large" spinning={loading}>
              <Content className={styles.content}>{children}</Content>
            </Spin>

            <Footer className={styles.footer}>
              <GlobalFooter
                links={[]}
                copyright={
                  <Fragment>
                    Copyright <Icon type="copyright" /> {new Date().getFullYear()}{' '}
                    {config.COPYRIGHT}
                  </Fragment>
                }
              />
            </Footer>
            <BackTop />
          </Layout>
        </Layout>
      </DocumentTitle>
    );
  }
}
