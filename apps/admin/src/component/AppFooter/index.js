import React from 'react';
import cssModules from 'react-css-modules';
import { Icon } from 'antd';
import { GlobalFooter } from 'ant-design-pro';
import styles from './style.less';

@cssModules(styles)
class AppFooter extends React.Component {
  static defaultProps = {
    links: [
      {
        key: 'help',
        title: '帮助',
        href: ''
      },
      {
        key: 'privacy',
        title: '隐私',
        href: ''
      },
      {
        key: 'terms',
        title: '条款',
        href: ''
      }
    ],
    copyright: (
      <div>
        Copyright <Icon type="copyright" /> Copyright  2018 蚂蚁金服体验技术部出品
      </div>
    )
  }

  render() {
    const { links, copyright } = this.props;

    return <GlobalFooter links={links} copyright={copyright} />;
  }
}

export default AppFooter;
