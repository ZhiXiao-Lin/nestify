import React, { Component, Fragment } from 'react';
import { Icon, List } from 'antd';

export default class BindingView extends Component {
	getData = () => [
		{
			title: '绑定微信',
			description: '当前账户未绑定微信账号',
			actions: [ <a>立即绑定</a> ],
			avatar: <Icon type="wechat" className="wechat" />
		},
		{
			title: '绑定支付宝',
			description: '当前账户未绑定支付宝账号',
			actions: [ <a>立即绑定</a> ],
			avatar: <Icon type="alipay" className="alipay" />
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
							<List.Item.Meta avatar={item.avatar} title={item.title} description={item.description} />
						</List.Item>
					)}
				/>
			</Fragment>
		);
	}
}
