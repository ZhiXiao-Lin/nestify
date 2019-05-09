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
	Spin,
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
import debounce from 'lodash/debounce';

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
@connect(({ mechanism, user, loading }) => ({
	data: mechanism.data,
	user: mechanism.user,
	loading: loading.models.mechanism,
	users: user.searchs,
	fetching: loading.models.user
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

	constructor(props) {
		super(props);

		this.fetchUser = debounce(this.fetchUser, 800);
	}

	componentDidMount() {
		this.refresh();
	}

	fetchUser = (e) => {
		if (!!e) {
			this.props.dispatch({
				type: 'user/search',
				payload: e
			});
		}
	};

	handleUserChange = (user) => {
		this.props.dispatch({
			type: 'mechanism/set',
			payload: {
				user
			}
		});
	};

	refresh = (page) => {
		const { dispatch } = this.props;
		dispatch({
			type: 'mechanism/fetch',
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

	closeDetail = () => {
		this.setState({
			detailVisible: false
		});
	};

	saveDetail = (e) => {
		e.preventDefault();

		const { dispatch } = this.props;
		const { selectedRow } = this.state;

		this.props.form.validateFields((err, values) => {
			if (!err) {
				if (!!selectedRow) {
					dispatch({
						type: 'mechanism/update',
						payload: {
							mechanism: this.state.selectedRow,
							values
						}
					});
				} else {
					dispatch({
						type: 'mechanism/create',
						payload: {
							values
						}
					});
				}
				this.closeDetail();
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

	handleSelectRows = (rows) => {
		this.setState({
			selectedRows: rows
		});
	};

	render() {
		const { data, loading, users, fetching, user } = this.props;
		const { getFieldDecorator } = this.props.form;
		const { selectedRow, selectedRows, modalVisible, updateModalVisible, stepFormValues } = this.state;

		return (
			<PageHeaderWrapper title="机构列表">
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
							type: 'mechanism/update',
							payload: {
								mechanism: this.state.selectedRow,
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

				<div className={styles.tableListForm}>
					<span>
						<Button type="primary" onClick={() => this.showDetail(null)}>
							新增
						</Button>
					</span>
				</div>

				<Card bordered={false}>
					<div className={styles.tableList}>
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
									title: '机构名称',
									dataIndex: 'name'
								},
								{
									title: '机构编号',
									dataIndex: 'token'
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
									title: '买入手续费成本',
									dataIndex: 'sonBuyInterest',
									render: (val) => `${val * 100}%`
								},
								{
									title: '卖出手续费成本',
									dataIndex: 'sonSellInterest',
									render: (val) => `${val * 100}%`
								},
								{
									title: '现金金额',
									dataIndex: 'saleBalance',
									render: (val) => (val ? val.toFixed(2) : '')
								},
								{
									title: '创建时间',
									dataIndex: 'createAt',
									render: (val) => <span>{moment(val).format('YYYY-MM-DD HH:mm:ss')}</span>
								}
							]}
							// scroll={{ x: 1200, y: 300 }}
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
				<Drawer
					title={!!selectedRow ? '修改' : '新增'}
					width={720}
					onClose={this.closeDetail}
					visible={this.state.detailVisible}
				>
					<Form layout="vertical" hideRequiredMark onSubmit={this.saveDetail}>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="机构名称">
									{getFieldDecorator('name', {
										initialValue: !selectedRow ? '' : selectedRow.name,
										rules: [ { required: true, message: '请输入机构名称' } ]
									})(<Input placeholder="请输入机构名称" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="机构编号">
									{getFieldDecorator('token', {
										initialValue: !selectedRow ? '' : selectedRow.token,
										rules: [ { required: true, message: '请输入机构编号' } ]
									})(<Input placeholder="请输入机构编号" />)}
								</Form.Item>
							</Col>
						</Row>

						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="买入手续费">
									{getFieldDecorator('buyInterest', {
										initialValue: !selectedRow ? '' : selectedRow.buyInterest,
										rules: [ { required: true, message: '请输入买入手续费' } ]
									})(<Input placeholder="请输入买入手续费" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="卖出手续费">
									{getFieldDecorator('sellInterest', {
										initialValue: !selectedRow ? '' : selectedRow.sellInterest,
										rules: [ { required: true, message: '请输入卖出手续费' } ]
									})(<Input placeholder="请输入卖出手续费" />)}
								</Form.Item>
							</Col>
						</Row>

						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="买入手续费成本">
									{getFieldDecorator('sonBuyInterest', {
										initialValue: !selectedRow ? '' : selectedRow.sonBuyInterest,
										rules: [ { required: true, message: '请输入买入手续费成本' } ]
									})(<Input placeholder="请输入买入手续费成本" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="卖出手续费成本">
									{getFieldDecorator('sonSellInterest', {
										initialValue: !selectedRow ? '' : selectedRow.sonSellInterest,
										rules: [ { required: true, message: '请输入卖出手续费成本' } ]
									})(<Input placeholder="请输入卖出手续费成本" />)}
								</Form.Item>
							</Col>
						</Row>
						{!selectedRow ? (
							<Row>
								<Col>
									<span>机构管理员</span>
									<Select
										labelInValue
										showSearch
										value={user}
										placeholder="搜索用户"
										notFoundContent={fetching ? <Spin size="small" /> : null}
										filterOption={false}
										onSearch={this.fetchUser}
										onChange={this.handleUserChange}
										style={{ width: '100%' }}
									>
										{users.map((u) => <Option key={u.id}>{u.realName || u.mobile}</Option>)}
									</Select>
								</Col>
							</Row>
						) : (
							''
						)}

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
