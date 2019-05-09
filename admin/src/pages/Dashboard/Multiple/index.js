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
@connect(({ multiple, loading }) => ({
	data: multiple.data,
	loading: loading.models.multiple
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
			type: 'multiple/fetch',
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
						type: 'multiple/update',
						payload: {
							mechanism: this.state.selectedRow,
							values
						}
					});
				} else {
					dispatch({
						type: 'multiple/create',
						payload: {
							values
						}
					});
				}
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
			<PageHeaderWrapper title="配资倍数">
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
							type: 'multiple/update',
							payload: {
								multiple: this.state.selectedRow,
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
									title: '倍数',
									dataIndex: 'rideMany'
								},
								{
									title: '利息',
									dataIndex: 'interest'
								},
								{
									title: '排序',
									dataIndex: 'order'
								},
								{
									title: '按交易日或按月',
									dataIndex: 'dayOrMonth'
								},
								{
									title: '机构成本',
									dataIndex: 'mechanismInterest',
									render: (val) => `${val * 100}%`
								},
								{
									title: '机构成本',
									dataIndex: 'parentInterest',
									render: (val) => `${val * 100}%`
								},

								{
									title: '创建时间',
									dataIndex: 'createAt',
									render: (val) => <span>{moment(val).format('YYYY-MM-DD HH:mm:ss')}</span>
								},

								{
									title: '操作',
									// fixed: 'right',
									render: (text, record) => (
										<Fragment>
											<Button
												type="primary"
												onClick={() =>
													this.props.dispatch({
														type: 'multiple/remove',
														payload: record
													})}
											>
												<Icon type="delete" />删除
											</Button>
										</Fragment>
									)
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
								<Form.Item label="倍数">
									{getFieldDecorator('rideMany', {
										initialValue: !selectedRow ? '' : selectedRow.rideMany,
										rules: [ { required: true, message: '请输入倍数' } ]
									})(<Input placeholder="请输入倍数" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="利息">
									{getFieldDecorator('interest', {
										initialValue: !selectedRow ? '' : selectedRow.interest,
										rules: [ { required: true, message: '请输入机构编号' } ]
									})(<Input placeholder="请输入机构编号" />)}
								</Form.Item>
							</Col>
						</Row>

						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="排序">
									{getFieldDecorator('order', {
										initialValue: !selectedRow ? '' : selectedRow.order,
										rules: [ { required: true, message: '请输入买入手续费' } ]
									})(<Input placeholder="请输入买入手续费" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="按交易日或按月">
									{getFieldDecorator('dayOrMonth', {
										initialValue: !selectedRow ? '' : selectedRow.dayOrMonth,
										rules: [ { required: true, message: '请输入按交易日或按月' } ]
									})(<Input placeholder="请输入按交易日或按月" />)}
								</Form.Item>
							</Col>
						</Row>

						<Row gutter={16}>
							<Col span={12}>
								<Form.Item label="机构成本">
									{getFieldDecorator('mechanismInterest', {
										initialValue: !selectedRow ? '' : selectedRow.mechanismInterest,
										rules: [ { required: true, message: '请输入机构成本' } ]
									})(<Input placeholder="请输入机构成本" />)}
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item label="推广员成本">
									{getFieldDecorator('parentInterest', {
										initialValue: !selectedRow ? '' : selectedRow.parentInterest,
										rules: [ { required: true, message: '请输入推广员成本' } ]
									})(<Input placeholder="请输入推广员成本" />)}
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
