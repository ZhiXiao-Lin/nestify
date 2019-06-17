import React from 'react';
import { LocaleProvider, Icon } from 'antd';
import Link from 'umi/link';
import DocumentTitle from 'react-document-title';
import moment from 'moment';
import 'moment/locale/zh-cn';

import GlobalFooter from '@/components/GlobalFooter';
import config from '@/config';

import zhCN from 'antd/lib/locale-provider/zh_CN';
import logo from '../assets/logo.svg';
import styles from './user.less';

moment.locale('zh-cn');

function UserLayout(props) {
  return (
    <DocumentTitle title={''}>
      <LocaleProvider locale={zhCN}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.top}>
              <div className={styles.header}>
                <Link to="/">
                  <img alt="logo" className={styles.logo} src={logo} />
                  <span className={styles.title}> {config.siteInfo.title} </span>
                </Link>
              </div>
              <div className={styles.desc}>{config.siteInfo.desc}</div>
            </div>
            {props.children}
          </div>
          <GlobalFooter
            links={[]}
            copyright={
              <React.Fragment>
                Copyright <Icon type="copyright" /> {new Date().getFullYear()} {config.siteInfo.copyright}
              </React.Fragment>
            }
          />
        </div>
      </LocaleProvider>
    </DocumentTitle>
  );
}

export default UserLayout;
