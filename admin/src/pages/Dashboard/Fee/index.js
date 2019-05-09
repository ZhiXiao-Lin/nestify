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
@connect(({ fee, loading }) => ({
	data: fee.data,
	loading: loading.models.fee
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
			type: 'fee/fetch',
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
		this.props.form.validateFields((err, values) => {
			if (!err) {
				this.props.dispatch({
					type: 'fee/update',
					payload: {
						fee: this.state.selectedRow,
						values
					}
				});
			}
		});

		this.closeDetail();
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
		const { data, loading } = this.props;
		const { getFieldDecorator } = this.props.form;
		const { selectedRow, selectedRows, modalVisible, updateModalVisible, stepFormValues } = this.state;

		return (
			<PageHeaderWrapper title="手续费流水">
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
							type: 'fee/update',
							payload: {
								fee: this.state.selectedRow,
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
						<StandardTable
							selectedRows={selectedRows}
							loading={loading}
							data={data}
							columns={[
								{
									title: 'ID',
									dataIndex: 'id'
									// fixed: 'left'
									// render: (text, row) => <a onClick={() => this.showDetail(row)}>{text}</a>
								},

								{
									title: '金额',
									dataIndex: 'amount',
									render: (val) => (val ? val.toFixed(2) : '')
								},
								{
									title: '类型',
									dataIndex: 'type',
									render: (val) => (val === 1 ? '增加' : '减少')
								},

								{
									title: '备注',
									dataIndex: 'remarks'
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
				<Drawer title="详细信息" width={720} onClose={this.closeDetail} visible={this.state.detailVisible}>
					<Form layout="vertical" hideRequiredMark onSubmit={this.saveDetail}>
						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="机构名称">
									{getFieldDecorator('name', {
										initialValue: selectedRow.name,
										rules: [ { required: true, message: '请输入机构名称' } ]
									})(<Input placeholder="请输入机构名称" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="机构编号">
									{getFieldDecorator('token', {
										initialValue: selectedRow.token,
										rules: [ { required: true, message: '请输入机构编号' } ]
									})(<Input placeholder="请输入机构编号" />)}
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

						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="买入手续费成本">
									{getFieldDecorator('sonBuyInterest', {
										initialValue: selectedRow.sonBuyInterest,
										rules: [ { required: true, message: '请输入买入手续费成本' } ]
									})(<Input placeholder="请输入买入手续费成本" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="卖出手续费成本">
									{getFieldDecorator('sonSellInterest', {
										initialValue: selectedRow.sonSellInterest,
										rules: [ { required: true, message: '请输入卖出手续费成本' } ]
									})(<Input placeholder="请输入卖出手续费成本" />)}
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
