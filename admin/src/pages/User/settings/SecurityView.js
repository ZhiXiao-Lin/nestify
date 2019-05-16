import React, { Component, Fragment } from 'react';
import { List } from 'antd';
// import { getTimeDistance } from '@/utils/utils';

const passwordStrength = {
	strong: <font className="strong">强</font>,
	medium: <font className="medium">中</font>,
	weak: <font className="weak">弱</font>
};

class SecurityView extends Component {
	getData = () => [
		{
			title: '账户密码',
			description: (
				<Fragment>
					当前密码强度：
					{passwordStrength.strong}
				</Fragment>
			),
			actions: [ <a>修改</a> ]
		},
		{
			title: '绑定手机',
			description: `已绑定手机：138****8293`,
			actions: [ <a>修改</a> ]
		}
	];

	render() {
		return (
			<Fragment>
				<List
					itemLayout="horizontal"
					dataSource={this.getData()}
					renderItem={(item) => (
						<List.Item actions={item.actions}>
							<List.Item.Meta title={item.title} description={item.description} />
						</List.Item>
					)}
				/>
			</Fragment>
		);
	}
}

export default SecurityView;
