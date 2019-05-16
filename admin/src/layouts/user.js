import React from 'react';
import { Icon } from 'antd';
import Link from 'umi/link';
import DocumentTitle from 'react-document-title';
import GlobalFooter from '@/components/GlobalFooter';

import logo from '../assets/logo.svg';
import styles from './user.less';

import config from '@/config';

function UserLayout(props) {
	return (
		<DocumentTitle title={''}>
			<div className={styles.container}>
				<div className={styles.content}>
					<div className={styles.top}>
						<div className={styles.header}>
							<Link to="/">
								<img alt="logo" className={styles.logo} src={logo} />
								<span className={styles.title}> {config.TITLE} </span>
							</Link>
						</div>
						<div className={styles.desc}> 后台管理系统 </div>
					</div>
					{props.children}
				</div>
				<GlobalFooter
					links={[]}
					copyright={
						<React.Fragment>
							Copyright <Icon type="copyright" /> {new Date().getFullYear()} {config.COPYRIGHT}
						</React.Fragment>
					}
				/>
			</div>
		</DocumentTitle>
	);
}

export default UserLayout;
