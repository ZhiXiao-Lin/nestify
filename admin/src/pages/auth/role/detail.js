import React, { Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import router from 'umi/router';
import { Tabs, Form, Input, InputNumber, Row, Col, Icon, Tree, Button, Skeleton, message, Divider } from 'antd';

const { TreeNode } = Tree;

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
	labelCol: { xs: { span: 24 }, sm: { span: 8 } },
	wrapperCol: { xs: { span: 24 }, sm: { span: 16 } }
};
const tailFormItemLayout = {
	wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } }
};

const MODEL_NAME = 'role';

@Form.create()
@connect(({ authority, role }) => ({
	authority,
	selectedNode: role.selectedNode
}))
export default class extends React.Component {
	state = {
		tabKey: 'basic',
		expandedKeys: [],
		autoExpandParent: true,
	};

	componentDidMount() {
		this.loadData();
	}

	componentWillReceiveProps(nextProps) {
		const { match: { params } } = nextProps;
		if (this.props.match.params.id !== params.id) {
			this.loadData(params.id);
		}
	}

	loadData = (id) => {
		const { dispatch, match: { params } } = this.props;

		if (!!params.id) {
			if ('CREATE' !== params.id) {
				dispatch({
					type: `${MODEL_NAME}/detail`,
					payload: {
						id: id || params.id,
						callback: (selectedNode) => {
							this.setState({
								expandedKeys: selectedNode.authoritys.map(item => item.id),
								autoExpandParent: false,
							});
						}
					}
				});
			} else {
				dispatch({
					type: `${MODEL_NAME}/set`,
					payload: {
						selectedNode: {}
					}
				});
			}
		}

		dispatch({
			type: 'authority/fetch',
			payload: {}
		});
	};

	onTabChange = (tabKey) => {
		this.setState({ tabKey });
	};

	resetHandler = () => {
		this.props.form.resetFields();
	};

	submitHandler = (e) => {
		e.preventDefault();

		const { dispatch, match: { params } } = this.props;

		this.props.form.validateFields((err, values) => {
			if (!!err || Object.keys(values).length === 0) {
				return;
			}

			values['publish_at'] = moment(values['publish_at']).format('YYYY-MM-DD HH:mm:ss');
			values['category'] = params.channel;

			dispatch({
				type: `${MODEL_NAME}/save`,
				payload: values
			});
		});
	};

	onSave = () => {
		const { dispatch } = this.props;

		dispatch({
			type: `${MODEL_NAME}/save`,
			payload: {}
		});
	};

	onCheck = (selectedRows) => {
		const { selectedNode } = this.props;

		selectedNode.authoritys = selectedRows.map(item => ({ id: item }))

		this.props.dispatch({
			type: `${MODEL_NAME}/set`,
			payload: {
				selectedNode
			}
		});
	}

	onExpand = expandedKeys => {

		this.setState({
			expandedKeys,
			autoExpandParent: false,
		});
	};

	renderBasicForm = () => {
		const { selectedNode, form: { getFieldDecorator } } = this.props;

		return (
			<Form onSubmit={this.submitHandler} className="panel-form">

				<Form.Item {...formItemLayout} label="名称">
					{getFieldDecorator('name', {
						initialValue: !selectedNode ? null : selectedNode['name'],
						rules: [
							{
								required: true,
								message: '名称不能为空'
							}
						]
					})(<Input {...formItemStyle} type="text" placeholder="请填写名称" />)}
				</Form.Item>

				<Form.Item {...formItemLayout} label="标识">
					{getFieldDecorator('token', {
						initialValue: !selectedNode ? 0 : selectedNode['token']
					})(<Input disabled={selectedNode.isSuperAdmin} {...formItemStyle} placeholder="请填写标识" />)}
				</Form.Item>

				<Form.Item {...formItemLayout} label="描述">
					{getFieldDecorator('desc', {
						initialValue: !selectedNode ? 0 : selectedNode['desc']
					})(<Input {...formItemStyle} placeholder="请填写描述" />)}
				</Form.Item>

				<Form.Item {...formItemLayout} label="排序">
					{getFieldDecorator('sort', {
						initialValue: !selectedNode ? 0 : selectedNode['sort']
					})(<InputNumber min={0} {...formItemStyle} placeholder="请填写排序" />)}
				</Form.Item>


				<Form.Item {...tailFormItemLayout}>
					<Row>
						<Col span={3}>
							<Button onClick={this.resetHandler}>重置</Button>
						</Col>
						<Col>
							<Button type="primary" htmlType="submit">
								{!selectedNode['id'] ? '新增' : '保存'}
							</Button>
						</Col>
					</Row>
				</Form.Item>
			</Form>
		);
	};

	renderTreeNodes = data =>
		data.sort((a, b) => a.sort - b.sort).map(item => {
			if (item.children) {
				return (
					<TreeNode title={item.name} key={item.id} dataRef={item}>
						{this.renderTreeNodes(item.children)}
					</TreeNode>
				);
			}
			return <TreeNode {...item} />;
		});

	render() {
		const { selectedNode, authority } = this.props;

		if (!selectedNode) return <Skeleton active loading />;

		const checkedKeys = selectedNode.authoritys.map(item => item.id);

		return (
			<Fragment>
				<Button onClick={() => router.go(-1)}>
					<Icon type="arrow-left" />返回
				</Button>
				<Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
					<Tabs.TabPane tab="基本信息" key="basic">
						{this.renderBasicForm()}
					</Tabs.TabPane>
					<Tabs.TabPane disabled={selectedNode.isSuperAdmin} tab="权限分配" key="authority">
						<Button type="primary" onClick={this.onSave}>保存</Button>
						<Tree
							blockNode
							checkable
							onExpand={this.onExpand}
							checkedKeys={checkedKeys}
							expandedKeys={this.state.expandedKeys}
							autoExpandParent={this.state.autoExpandParent}
							onCheck={this.onCheck}
						>
							{this.renderTreeNodes(authority.data)}
						</Tree>
					</Tabs.TabPane>
				</Tabs>
			</Fragment>
		);
	}
}
