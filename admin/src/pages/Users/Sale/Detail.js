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
import { withRouter } from 'dva/router';

const FormItem = Form.Item;

const statusMap = [ 'success', 'error', 'info', 'warning' ];
const status = [ '增加', '减少', '冻结', '解冻' ];

/* eslint react/no-multi-comp:0 */
@connect(({ funding, loading }) => ({
	data: funding.data,
	loading: loading.models.funding
}))
@Form.create()
@withRouter
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
		const { id } = this.props.location.query;

		dispatch({
			type: 'funding/fetch',
			payload: {
				page,
				userId: id
			}
		});
	};

	reload = () => {
		this.refresh(0);
	};

	renderActionMenu = (row) => {
		return (
			<Menu onClick={(e) => this.handleActionMenuClick(e, row)}>
				<Menu.Item key={3}>驳回</Menu.Item>
				<Menu.Item key={1}>通过</Menu.Item>
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
			type: 'funding/update',
			payload: {
				user: row,
				values: {
					realNameStatus: e.key
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

		// dispatch({
		// 	type: 'rule/fetch',
		// 	payload: params
		// });
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
			<PageHeaderWrapper title="资金明细">
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
									dataIndex: 'id'
								},
								{
									title: '姓名',
									dataIndex: 'user.realName'
								},
								{
									title: '手机号',
									dataIndex: 'user.mobile'
								},

								{
									title: '金额',
									dataIndex: 'amount'
								},

								{
									title: '现金',
									dataIndex: 'cashBalance'
								},

								{
									title: '投顾',
									dataIndex: 'assetBalance'
								},
								{
									title: '冻结',
									dataIndex: 'frozenBalance'
								},

								{
									title: '类型',
									dataIndex: 'type',
									render: (val) => <Badge status={statusMap[val + 1]} text={status[val + 1]} />
								},

								{
									title: '备注信息',
									dataIndex: 'message'
								},

								{
									title: '创建时间',
									dataIndex: 'createAt',
									render: (val) => <span>{moment(val).format('YYYY-MM-DD HH:mm:ss')}</span>
								}
							]}
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
			</PageHeaderWrapper>
		);
	}
}
