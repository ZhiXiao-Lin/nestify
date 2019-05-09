import React, { PureComponent, Fragment } from 'react';
import { connect } from 'dva';
import moment from 'moment';
import router from 'umi/router';
import {
	Row,
	Col,
	Card,
	Form,
	Input,
	Select,
	Icon,
	Button,
	Dropdown,
	Menu,
	InputNumber,
	DatePicker,
	Modal,
	Drawer,
	message,
	Badge,
	Divider,
	Steps,
	Radio,
	Pagination
} from 'antd';
import StandardTable from '@/components/StandardTable';
import PageHeaderWrapper from '@/components/PageHeaderWrapper';
import config from '@/config';

import styles from './index.less';

const FormItem = Form.Item;
const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;
const RadioGroup = Radio.Group;
const getValue = (obj) => Object.keys(obj).map((key) => obj[key]).join(',');
const statusMap = [ 'default', 'success', 'warning', 'error' ];
const status = [ '未审核', '已审核', '待审核', '已驳回' ];
const positionStatus = [ '正常', '预警中', '强平中' ];

/* eslint react/no-multi-comp:0 */
@connect(({ user, loading }) => ({
	data: user.data,
	loading: loading.models.user
}))
@Form.create()
export default class extends PureComponent {
	state = {
		modalVisible: false,
		detailVisible: false,
		updateModalVisible: false,
		expandForm: false,
		selectedRows: [],
		formValues: {},
		stepFormValues: {},
		visible: false,
		selectedRow: {}
	};

	componentDidMount() {
		this.refresh();
	}

	refresh = (page) => {
		const { dispatch } = this.props;
		dispatch({
			type: 'user/fetch',
			payload: {
				page
			}
		});
	};

	reload = () => {
		this.refresh(0);
	};

	showDetail = (row) => {
		this.setState({
			detailVisible: true,
			selectedRow: row
		});
	};

	showFundingDetail = (user) => {
		router.push({
			pathname: '/users/funding',
			query: {
				id: user.id
			}
		});
	};

	closeDetail = () => {
		this.setState({
			detailVisible: false
		});
	};

	saveDetail = (e) => {
		e.preventDefault();
		this.props.form.validateFields((err, values) => {
			if (!err) {
				this.props.dispatch({
					type: 'user/update',
					payload: {
						user: this.state.selectedRow,
						values
					}
				});
			}
		});

		this.closeDetail();
	};

	renderActionMenu = (row) => {
		return (
			<Menu onClick={(e) => this.handleActionMenuClick(e, row)}>
				<Menu.Item key={3}>驳回</Menu.Item>
				<Menu.Item key={1}>通过</Menu.Item>
			</Menu>
		);
	};

	renderSettingMenu = (row) => {
		return (
			<Menu onClick={(e) => this.handleSettingMenuClick(e, row)}>
				<Menu.Item key={'sale'}>推广员</Menu.Item>
				<Menu.Item key={'mechanism'}>机构管理员</Menu.Item>
			</Menu>
		);
	};

	handleActionMenuClick = (e, row) => {
		const { dispatch } = this.props;

		if (e.key == 3) {
			this.setState((state) => ({ ...state, visible: true, selectedRow: row }));
			return false;
		}

		dispatch({
			type: 'user/update',
			payload: {
				user: row,
				values: {
					realNameStatus: e.key
				}
			}
		});
	};

	handleSettingMenuClick = (e, row) => {
		const { dispatch } = this.props;

		dispatch({
			type: 'user/roles',
			payload: {
				user: row,
				values: {
					token: e.key
				}
			}
		});
	};

	handleStandardTableChange = (pagination, filtersArg, sorter) => {
		const { dispatch } = this.props;
		const { formValues } = this.state;

		const filters = Object.keys(filtersArg).reduce((obj, key) => {
			const newObj = { ...obj };
			newObj[key] = getValue(filtersArg[key]);
			return newObj;
		}, {});

		const params = {
			currentPage: pagination.current,
			pageSize: pagination.pageSize,
			...formValues,
			...filters
		};
		if (sorter.field) {
			params.sorter = `${sorter.field}_${sorter.order}`;
		}

		dispatch({
			type: 'rule/fetch',
			payload: params
		});
	};

	previewItem = (id) => {
		router.push(`/profile/basic/${id}`);
	};

	handleFormReset = () => {
		const { form, dispatch } = this.props;
		form.resetFields();
		this.setState({
			formValues: {}
		});
		dispatch({
			type: 'rule/fetch',
			payload: {}
		});
	};

	toggleForm = () => {
		const { expandForm } = this.state;
		this.setState({
			expandForm: !expandForm
		});
	};

	handleMenuClick = (e) => {
		const { dispatch } = this.props;
		const { selectedRows } = this.state;

		if (selectedRows.length === 0) return;
		switch (e.key) {
			case 'remove':
				dispatch({
					type: 'rule/remove',
					payload: {
						key: selectedRows.map((row) => row.key)
					},
					callback: () => {
						this.setState({
							selectedRows: []
						});
					}
				});
				break;
			default:
				break;
		}
	};

	handleSelectRows = (rows) => {
		this.setState({
			selectedRows: rows
		});
	};

	handleSearch = (e) => {
		e.preventDefault();

		const { dispatch, form } = this.props;

		form.validateFields((err, fieldsValue) => {
			if (err) return;

			const values = {
				...fieldsValue,
				updatedAt: fieldsValue.updatedAt && fieldsValue.updatedAt.valueOf()
			};

			this.setState({
				formValues: values
			});

			dispatch({
				type: 'rule/fetch',
				payload: values
			});
		});
	};

	handleModalVisible = (flag) => {
		this.setState({
			modalVisible: !!flag
		});
	};

	handleUpdateModalVisible = (flag, record) => {
		this.setState({
			updateModalVisible: !!flag,
			stepFormValues: record || {}
		});
	};

	handleUpdate = (fields) => {
		const { dispatch } = this.props;
		const { formValues } = this.state;
		dispatch({
			type: 'rule/update',
			payload: {
				query: formValues,
				body: {
					name: fields.name,
					desc: fields.desc,
					key: fields.key
				}
			}
		});

		message.success('配置成功');
		this.handleUpdateModalVisible();
	};

	renderForm() {
		const { form: { getFieldDecorator } } = this.props;
		return (
			<Form onSubmit={this.handleSearch} layout="inline">
				<Row gutter={{ md: 8, lg: 24, xl: 48 }}>
					<Col md={8} sm={24}>
						<FormItem label="关键词">{getFieldDecorator('name')(<Input placeholder="请输入关键词" />)}</FormItem>
					</Col>
				</Row>
				<Row gutter={{ md: 8, lg: 24, xl: 48 }}>
					<Col md={8} sm={24}>
						<FormItem label="实名状态">
							{getFieldDecorator('status')(
								<Select placeholder="请选择" style={{ width: '100%' }}>
									<Option value="0">关闭</Option>
									<Option value="1">运行中</Option>
								</Select>
							)}
						</FormItem>
					</Col>
					<Col md={8} sm={24}>
						<FormItem label="账户状态">
							{getFieldDecorator('status3')(
								<Select placeholder="请选择" style={{ width: '100%' }}>
									<Option value="0">关闭</Option>
									<Option value="1">运行中</Option>
								</Select>
							)}
						</FormItem>
					</Col>
				</Row>
				<div style={{ overflow: 'hidden' }}>
					<div style={{ marginBottom: 24 }}>
						<Button type="primary" htmlType="submit">
							查询
						</Button>
						<Button style={{ marginLeft: 8 }} onClick={this.handleFormReset}>
							重置
						</Button>
					</div>
				</div>
			</Form>
		);
	}

	render() {
		const { data, loading } = this.props;
		const { getFieldDecorator } = this.props.form;
		const { selectedRow, selectedRows, modalVisible, updateModalVisible, stepFormValues } = this.state;

		const menu = (
			<Menu onClick={this.handleMenuClick} selectedKeys={[]}>
				<Menu.Item key="remove">删除</Menu.Item>
				<Menu.Item key="approval">批量审批</Menu.Item>
			</Menu>
		);

		const parentMethods = {
			handleAdd: this.handleAdd,
			handleModalVisible: this.handleModalVisible
		};
		const updateMethods = {
			handleUpdateModalVisible: this.handleUpdateModalVisible,
			handleUpdate: this.handleUpdate
		};
		return (
			<PageHeaderWrapper title="用户列表">
				<Modal
					title="驳回理由"
					visible={this.state.visible}
					onOk={() => {
						const rejectMsg = this.rejectMsgRef.input.value;
						if (!rejectMsg) {
							message.error('请填写驳回理由！');
							return false;
						}
						this.props.dispatch({
							type: 'user/update',
							payload: {
								user: this.state.selectedRow,
								values: {
									realNameStatus: 3,
									rejectMsg
								}
							}
						});
						this.setState((state) => ({ ...state, visible: false }));
					}}
					onCancel={() => this.setState((state) => ({ ...state, visible: false }))}
				>
					<Input placeholder="请输入驳回理由" ref={(e) => (this.rejectMsgRef = e)} />
				</Modal>
				<Card bordered={false}>
					<div className={styles.tableList}>
						{/* <div className={styles.tableListForm}>{this.renderForm()}</div> */}
						<div className={styles.tableListOperator}>
							{selectedRows.length > 0 && (
								<span>
									<Dropdown overlay={menu}>
										<Button>
											更多操作 <Icon type="down" />
										</Button>
									</Dropdown>
								</span>
							)}
						</div>
						<StandardTable
							selectedRows={selectedRows}
							loading={loading}
							data={data}
							columns={[
								{
									title: 'ID',
									dataIndex: 'id',
									// fixed: 'left',
									render: (text, row) => <a onClick={() => this.showDetail(row)}>{text}</a>
								},
								{
									title: '明细',
									dataIndex: 'detail',
									// fixed: 'left',
									render: (text, row) => <a onClick={() => this.showFundingDetail(row)}>明细</a>
								},
								{
									title: '姓名',
									dataIndex: 'realName'
								},
								{
									title: '手机号',
									dataIndex: 'mobile'
								},
								{
									title: '资产余额',
									dataIndex: 'assetBalance'
								},
								{
									title: '现金余额',
									dataIndex: 'cashBalance'
								},
								{
									title: '冻结金额',
									dataIndex: 'frozenBalance'
								},
								{
									title: '预警线',
									dataIndex: 'warningLine'
								},
								{
									title: '强平线',
									dataIndex: 'openLine'
								},
								{
									title: '买入手续费',
									dataIndex: 'buyInterest',
									render: (val) => `${val * 100}%`
								},
								{
									title: '卖出手续费',
									dataIndex: 'sellInterest',
									render: (val) => `${val * 100}%`
								},
								{
									title: '扣息比例',
									dataIndex: 'costInterest',
									render: (val) => `${val * 100}%`
								},
								{
									title: '角色',
									dataIndex: 'roles',
									render: (roles) => roles.map((val) => val.name).join(',')
								},
								{
									title: '机构名称',
									dataIndex: 'mechanism.name'
								},
								{
									title: '机构编号',
									dataIndex: 'mechanism.token'
								},
								{
									title: '实名状态',
									dataIndex: 'realNameStatus',
									render(val) {
										return <Badge status={statusMap[val]} text={status[val]} />;
									}
								},
								{
									title: '状态',
									dataIndex: 'isEnable',
									render(val) {
										return positionStatus[val.positionStatus ? val.positionStatus : 0];
									}
								},
								{
									title: '注册时间',
									dataIndex: 'createAt',
									render: (val) => <span>{moment(val).format('YYYY-MM-DD HH:mm:ss')}</span>
								},
								{
									title: '操作',
									// fixed: 'right',
									render: (text, record) => (
										<Fragment>
											<Dropdown overlay={() => this.renderActionMenu(record)}>
												<Button style={{ marginLeft: 8 }}>
													审核 <Icon type="down" />
												</Button>
											</Dropdown>
											<Dropdown overlay={() => this.renderSettingMenu(record)}>
												<Button style={{ marginLeft: 8 }}>
													设置 <Icon type="down" />
												</Button>
											</Dropdown>
										</Fragment>
									)
								}
							]}
							expandedRowRender={(record) => (
								<Fragment>
									<p>身份证号:{record.idCard}</p>
									<p>
										身份证正面照:{' '}
										<img style={{ maxWidth: 400 }} src={config.UPLOAD_PATH + record.idCardA} />
									</p>
									<p>
										身份证反面照:{' '}
										<img style={{ maxWidth: 400 }} src={config.UPLOAD_PATH + record.idCardB} />
									</p>
								</Fragment>
							)}
							// scroll={{ x: 2000, y: 300 }}
							onSelectRow={this.handleSelectRows}
							onChange={this.handleStandardTableChange}
						/>

						<Row style={{ marginTop: 20 }} type="flex" justify="end">
							<Col>
								<Pagination
									defaultCurrent={1}
									current={data.page}
									pageSize={data.pageSize}
									total={data.total}
									hideOnSinglePage={true}
									onChange={(page) => this.refresh(page)}
								/>
							</Col>
						</Row>
					</div>
				</Card>
				<Drawer title="详细信息" width={720} onClose={this.closeDetail} visible={this.state.detailVisible}>
					<Form layout="vertical" hideRequiredMark onSubmit={this.saveDetail}>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="姓名">
									{getFieldDecorator('realName', {
										initialValue: selectedRow.realName,
										rules: [ { required: true, message: '请输入姓名' } ]
									})(<Input placeholder="请输入姓名" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="手机号">
									{getFieldDecorator('mobile', {
										initialValue: selectedRow.mobile,
										rules: [ { required: true } ]
									})(<Input disabled />)}
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="现金余额">
									{getFieldDecorator('cashBalance', {
										initialValue: selectedRow.cashBalance,
										rules: [ { required: true, message: '请输入现金余额' } ]
									})(<Input placeholder="请输入现金余额" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="资产余额">
									{getFieldDecorator('assetBalance', {
										initialValue: selectedRow.assetBalance,
										rules: [ { required: true, message: '请输入资产余额' } ]
									})(<Input placeholder="请输入资产余额" />)}
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="扣息比例">
									{getFieldDecorator('costInterest', {
										initialValue: selectedRow.costInterest,
										rules: [ { required: true, message: '请输入扣息比例' } ]
									})(<Input placeholder="请输入扣息比例" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="冻结金额">
									{getFieldDecorator('frozenBalance', {
										initialValue: selectedRow.frozenBalance,
										rules: [ { required: true, message: '请输入资产冻结金额' } ]
									})(<Input placeholder="请输入资产冻结金额" />)}
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="预警线">
									{getFieldDecorator('warningLine', {
										initialValue: selectedRow.warningLine,
										rules: [ { required: true, message: '请输入预警线' } ]
									})(<Input placeholder="请输入预警线" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="强平线">
									{getFieldDecorator('openLine', {
										initialValue: selectedRow.openLine,
										rules: [ { required: true, message: '请输入强平线' } ]
									})(<Input placeholder="请输入强平线" />)}
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="买入手续费">
									{getFieldDecorator('buyInterest', {
										initialValue: selectedRow.buyInterest,
										rules: [ { required: true, message: '请输入买入手续费' } ]
									})(<Input placeholder="请输入买入手续费" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="卖出手续费">
									{getFieldDecorator('sellInterest', {
										initialValue: selectedRow.sellInterest,
										rules: [ { required: true, message: '请输入卖出手续费' } ]
									})(<Input placeholder="请输入卖出手续费" />)}
								</Form.Item>
							</Col>
						</Row>

						<div
							style={{
								position: 'absolute',
								left: 0,
								bottom: 0,
								width: '100%',
								borderTop: '1px solid #e9e9e9',
								padding: '10px 16px',
								background: '#fff',
								textAlign: 'right'
							}}
						>
							<Button onClick={this.closeDetail} style={{ marginRight: 8 }}>
								取消
							</Button>
							<Button type="primary" htmlType="submit">
								保存
							</Button>
						</div>
					</Form>
				</Drawer>
			</PageHeaderWrapper>
		);
	}
}
