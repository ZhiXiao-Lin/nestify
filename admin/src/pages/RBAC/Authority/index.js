import React, { Component, Fragment } from 'react';
import { connect } from 'dva';
import { Card, Collapse, Checkbox, Divider } from 'antd';
import PageHeaderWrapper from '@/components/PageHeaderWrapper';

import styles from './index.less';
const Panel = Collapse.Panel;
const CheckboxGroup = Checkbox.Group;

const authoritys = [
	{
		name: '操盘',
		childs: [ { id: 1, name: '数据分析' }, { id: 2, name: '订单管理' }, { id: 3, name: '投顾记录' }, { id: 4, name: '投顾付息' } ]
	},
	{
		name: '风控',
		childs: [
			{ id: 1, name: '风控规则' },
			{ id: 2, name: '持仓比例' },
			{ id: 3, name: '节假日' },
			{ id: 4, name: '黑名单' },
			{ id: 4, name: '白名单' }
		]
	},
	{
		name: '财务',
		childs: [ { id: 1, name: '充值管理' }, { id: 2, name: '提现管理' } ]
	},
	{
		name: '用户',
		childs: [ { id: 1, name: '前台用户' }, { id: 2, name: '后台用户' }, { id: 3, name: '推广用户' } ]
	},
	{
		name: '内容',
		childs: [ { id: 1, name: '轮播管理' }, { id: 2, name: '通知公告' } ]
	},
	{
		name: '代理',
		childs: [ { id: 1, name: '代理商管理' }, { id: 2, name: '机构管理' } ]
	},
	{
		name: '权限',
		childs: [ { id: 1, name: '权限分配' }, { id: 2, name: '角色管理' } ]
	},
	{
		name: '设置',
		childs: [ { id: 1, name: '系统设置' }, { id: 2, name: '平台设置' } ]
	}
];

@connect(({ profile, loading }) => ({
	profile,
	loading: loading.effects['profile/fetchBasic']
}))
export default class extends Component {
	state = {};

	componentDidMount() {
		const { dispatch, match } = this.props;
		const { params } = match;
	}

	onChange = (checkedList) => {
		this.setState({
			checkedList,
			indeterminate: !!checkedList.length && checkedList.length < plainOptions.length,
			checkAll: checkedList.length === plainOptions.length
		});
	};

	onCheckAllChange = (e) => {
		this.setState({
			checkedList: e.target.checked ? plainOptions : [],
			indeterminate: false,
			checkAll: e.target.checked
		});
	};

	render() {
		const { loading } = this.props;

		return (
			<PageHeaderWrapper title="权限分配" loading={loading}>
				<Card bordered={false}>
					{authoritys.map((item, index) => (
						<Collapse key={index} bordered={false}>
							<Panel
								header={
									<Checkbox
										indeterminate={this.state.indeterminate}
										onChange={this.onCheckAllChange}
										checked={this.state.checkAll}
									>
										{item.name}
									</Checkbox>
								}
							>
								<Card bordered={false}>
									<CheckboxGroup
										options={item.childs.map((sub) => sub.name)}
										value={this.state.checkedList}
										onChange={this.onChange}
									/>
								</Card>
							</Panel>
						</Collapse>
					))}
					{/* <Checkbox
						indeterminate={this.state.indeterminate}
						onChange={this.onCheckAllChange}
						checked={this.state.checkAll}
					>
						操盘
					</Checkbox>
					<Divider />
					<CheckboxGroup options={plainOptions} value={this.state.checkedList} onChange={this.onChange} /> */}
				</Card>
			</PageHeaderWrapper>
		);
	}
}
