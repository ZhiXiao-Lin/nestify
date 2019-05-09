import React, { Fragment } from 'react';
import { Layout, Icon } from 'antd';
import GlobalFooter from '@/components/GlobalFooter';

const { Footer } = Layout;
const FooterView = () => (
	<Footer style={{ padding: 0 }}>
		<GlobalFooter
			links={[
				// {
				// 	key: '首页',
				// 	title: '首页',
				// 	href: '/',
				// 	blankTarget: true
				// }
				// {
				// 	key: 'github',
				// 	title: <Icon type="github" />,
				// 	href: 'https://github.com/ant-design/ant-design-pro',
				// 	blankTarget: true
				// },
				// {
				// 	key: 'Ant Design',
				// 	title: 'Ant Design',
				// 	href: 'https://ant.design',
				// 	blankTarget: true
				// }
			]}
			copyright={
				<Fragment>
					Copyright <Icon type="copyright" /> {new Date().getFullYear()} 江西方大钢铁集团有限公司
				</Fragment>
			}
		/>
	</Footer>
);
export default FooterView;
