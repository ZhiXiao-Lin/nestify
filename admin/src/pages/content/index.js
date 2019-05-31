import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import router from 'umi/router';
import { connect } from 'dva';
import {
	Upload,
	Input,
	DatePicker,
	Popconfirm,
	Table,
	Tooltip,
	Layout,
	Row,
	Col,
	Form,
	Button,
	Icon,
	Select,
	Divider,
	Collapse,
	message
} from 'antd';

import { UploadActionType, apiUploadOne } from '@/utils';

import styles from './index.css';

const { Content } = Layout;
const ButtonGroup = Button.Group;
const Option = Select.Option;
const Panel = Collapse.Panel;
const { RangePicker } = DatePicker;

const MODEL_NAME = 'contents';
const DETAIL_URL = '/studio/contentdetail';

@connect(({ contents, loading }) => ({
	...contents,
	loading: loading.models.contents
}))
@Form.create()
export default class extends React.Component {

	componentDidMount() {
		const { match: { params } } = this.props;

		this.init(params.channel);
		this.onReset();
		this.refresh();
	}

	componentWillReceiveProps(nextProps) {
		const { match: { params } } = nextProps;
		if (this.props.match.params.channel !== params.channel) {
			this.init(params.channel);
			this.loadData({ page: 0, category: params.channel });
		}
	}

	init = (channel) => {

		let columns = [];
		let fields = [];
		let showQueryCondition = false;

		switch (channel) {
			case '联系方式':
				columns = [
					{
						title: '详情',
						dataIndex: 'id',
						render: (val) => <a onClick={this.toDetail(val)}>详情</a>
					},
					{
						title: '公司名称',
						dataIndex: 'ex_info.company',
					},
					{
						title: '电话',
						dataIndex: 'ex_info.phone',
					},
					{
						title: '传真',
						dataIndex: 'ex_info.fax',
					},
					{
						title: '销售',
						dataIndex: 'ex_info.sale',
					},
					{
						title: '地址',
						dataIndex: 'ex_info.address',
					},
					{
						title: '邮编',
						dataIndex: 'ex_info.postcode',
					},
				];
				fields = ['id', 'ex_info.company', 'ex_info.phone', 'ex_info.fax', 'ex_info.sale', 'ex_info.address', 'ex_info.postcode'];
				break;
			case '留言咨询':
				columns = [
					{
						title: '详情',
						dataIndex: 'id',
						render: (val) => <a onClick={this.toDetail(val)}>详情</a>
					},
					{
						title: '问题',
						dataIndex: 'ex_info.question',
					},
					{
						title: '回复',
						dataIndex: 'ex_info.reply',
					},
					{
						title: '回复时间',
						dataIndex: 'update_at',
						sorter: true,
						render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss')
					},
					{
						title: '留言时间',
						dataIndex: 'create_at',
						sorter: true,
						render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss')
					},
				];
				fields = ['id', 'ex_info.question', 'ex_info.reply', 'update_at', 'create_at'];
				break;
			case '投诉建议':
				columns = [
					{
						title: '详情',
						dataIndex: 'id',
						render: (val) => <a onClick={this.toDetail(val)}>详情</a>
					},
					{
						title: '昵称',
						dataIndex: 'ex_info.nickname',
					},
					{
						title: '标题',
						dataIndex: 'ex_info.title',
					},
					{
						title: '内容',
						dataIndex: 'ex_info.content',
					},
					{
						title: '电话',
						dataIndex: 'ex_info.phone',
					},
					{
						title: '提交时间',
						dataIndex: 'create_at',
						sorter: true,
						render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss')
					},
				];
				fields = ['id', 'ex_info.nickname', 'ex_info.title', 'ex_info.content', 'ex_info.phone', 'create_at'];
				break;
			default:
				columns = [
					{
						title: '详情',
						dataIndex: 'id',
						render: (val) => <a onClick={this.toDetail(val)}>详情</a>
					},
					{
						title: '图片',
						dataIndex: 'thumbnailPath',
						render: (val) => (!val ? null : <img style={{ width: '60px' }} src={val} />)
					},
					{
						title: '视频',
						dataIndex: 'videoPath',
						render: (val) => val
					},
					{
						title: '标题',
						dataIndex: 'title',
						render: (val) => {

							const { queryParams: { keyword } } = this.props;

							const reg = new RegExp(keyword, 'gi');


							return !!keyword ? val.toString().split(reg).map(
								(text, i) =>
									i > 0
										? [
											<span key={i} col={i} style={{ color: 'red' }}>
												<b>{val.toString().match(reg)[0]}</b>
											</span>,
											text
										]
										: text
							) : val;
						}
					},
					{
						title: '作者',
						dataIndex: 'author'
					},
					{
						title: '分类',
						dataIndex: 'category',
						render: val => val.name
					},
					{
						title: '来源',
						dataIndex: 'source'
					},
					{
						title: '摘要',
						dataIndex: 'summary'
					},
					{
						title: '地址',
						dataIndex: 'address'
					},
					{
						title: '排序',
						dataIndex: 'sort',
						sorter: true
					},
					{
						title: '浏览量',
						dataIndex: 'views',
						sorter: true
					},
					{
						title: '发布时间',
						dataIndex: 'publish_at',
						sorter: true,
						render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss')
					},
					{
						title: '修改时间',
						dataIndex: 'update_at',
						sorter: true,
						render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss')
					},
					{
						title: '创建时间',
						dataIndex: 'create_at',
						sorter: true,
						render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss')
					},
					{
						title: '正文',
						dataIndex: 'text',
						render: val => '略'
					},
				];

				fields = ['id', 'thumbnailPath', 'title', 'author', 'source', 'sort', 'views', 'publish_at', 'update_at'];
				showQueryCondition = true;
				break;
		}



		this.props.dispatch({
			type: `${MODEL_NAME}/set`,
			payload: {
				columns,
				fields,
				showQueryCondition
			}
		})
	}

	loadData = (payload) => {
		const { dispatch, match: { params } } = this.props;

		payload.category = !!payload.category ? payload.category : params.channel;

		dispatch({
			type: `${MODEL_NAME}/fetch`,
			payload
		});
	};

	refresh = () => {
		const { data } = this.props;
		this.loadData({ page: data.page });
	};

	toCreate = () => {
		const { match: { params } } = this.props;

		router.push(`${DETAIL_URL}/${params.channel}/CREATE`);
	};

	toDetail = (id) => (e) => {
		const { match: { params } } = this.props;

		router.push(`${DETAIL_URL}/${params.channel}/${id}`);
	};

	toRemove = () => {
		const { dispatch } = this.props;
		dispatch({
			type: `${MODEL_NAME}/remove`,
			payload: {
				callback: () => this.refresh()
			}
		});
	};

	toExport = () => {
		const { fields } = this.state;
		const { dispatch } = this.props;

		dispatch({
			type: `${MODEL_NAME}/export`,
			payload: {
				fields: fields.join(',')
			}
		});
	};

	onTableChange = (pagination, filters, sorter, extra) => {
		let sort = null;
		let order = null;

		if (!_.isEmpty(sorter)) {
			sort = sorter.columnKey;
			order = sorter.order === 'ascend' ? 'ASC' : 'DESC';
		}

		this.loadData({ page: pagination.current, sort, order });
	};

	onFieldsChange = (fields) => {
		this.setState((state) => ({
			...state,
			fields
		}));
	};

	onSubmit = (e) => {
		e.preventDefault();

		this.props.form.validateFields((err, values) => {

			if (!!err) return false;

			if (!!values.publish_at) {
				values.publish_at = values.publish_at.map(item => moment(item).format('YYYY-MM-DD HH:mm:ss')).join(',')
			}

			this.loadData({ page: 0, ...values })
		});
	}

	onReset = () => {
		this.props.form.resetFields();

		const { match: { params } } = this.props;

		this.props.dispatch({
			type: `${MODEL_NAME}/set`,
			payload: {
				queryParams: {
					category: params.channel
				}
			}
		});
	};

	render() {
		const { dispatch, data, selectedRows, selectedRowKeys, columns, fields, showQueryCondition, loading } = this.props;
		const { getFieldDecorator } = this.props.form;

		const tableColumns = columns.filter((item) => fields.includes(item.dataIndex));


		const list = data.list || [];

		const uploadOneProps = {
			name: 'file',
			action: null,
			accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel',
			showUploadList: false,
			beforeUpload: async (file) => {
				message.loading('正在执行导入', 0);
				await apiUploadOne(file, { action: UploadActionType.IMPORT, target: 'news' });

				setTimeout(() => {
					message.destroy();
					message.success('导入成功');
					this.refresh();
				}, 3000);

				return false;
			}
		};

		const pagination = {
			defaultCurrent: 1,
			current: data.page,
			pageSize: data.pageSize,
			total: data.total,
			hideOnSinglePage: true,
			showTotal: (total) => `共${total}条记录 `
		};

		const rowSelection = {
			selectedRowKeys,
			onChange: (selectedRowKeys, selectedRows) => {
				dispatch({
					type: `${MODEL_NAME}/set`,
					payload: {
						selectedRowKeys,
						selectedRows
					}
				});
			}
		};

		return (
			<Layout>
				<Content className={styles.normal}>
					{showQueryCondition ?
						<Collapse defaultActiveKey={['1']}>
							<Panel header="查询条件" key="1">
								<Form
									onSubmit={this.onSubmit}
									style={{
										padding: 5,
										marginBottom: 20
									}}
								>
									<Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="标题">
										{getFieldDecorator('keyword')(<Input placeholder="请输入搜索关键词" />)}
									</Form.Item>

									<Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="发布时间">
										{getFieldDecorator('publish_at')(
											<RangePicker
												showTime
												format="YYYY-MM-DD HH:mm:ss"
												locale={{
													lang: {
														placeholder: 'Select date',
														rangePlaceholder: ['开始时间', '结束时间'],
														today: 'Today',
														now: 'Now',
														backToToday: 'Back to today',
														ok: 'Ok',
														clear: 'Clear',
														month: 'Month',
														year: 'Year',
														timeSelect: 'Select time',
														dateSelect: 'Select date',
														monthSelect: 'Choose a month',
														yearSelect: 'Choose a year',
														decadeSelect: 'Choose a decade',
														yearFormat: 'YYYY',
														dateFormat: 'M/D/YYYY',
														dayFormat: 'D',
														dateTimeFormat: 'M/D/YYYY HH:mm:ss',
														monthFormat: 'MMMM',
														monthBeforeYear: true,
														previousMonth: 'Previous month (PageUp)',
														nextMonth: 'Next month (PageDown)',
														previousYear: 'Last year (Control + left)',
														nextYear: 'Next year (Control + right)',
														previousDecade: 'Last decade',
														nextDecade: 'Next decade',
														previousCentury: 'Last century',
														nextCentury: 'Next century'
													}
												}}
											/>
										)}
									</Form.Item>

									<Row>
										<Col span={12} offset={3}>
											<Button type="primary" htmlType="submit">
												<Icon type="search" />搜索
										</Button>
											<Button style={{ marginLeft: 8 }} onClick={this.onReset}>
												<Icon type="undo" />重置
										</Button>
										</Col>
									</Row>
								</Form>
							</Panel>
						</Collapse> : ''
					}
					<Divider orientation="left" />
					<Row className="filter-row" gutter={6}>
						<Col className="gutter-row" span={10}>
							<ButtonGroup>
								{selectedRows.length > 0 ? (
									<Popconfirm
										title={`是否确认要删除选中的 ${selectedRows.length} 条记录？`}
										okText="是"
										cancelText="否"
										onConfirm={this.toRemove}
									>
										<Tooltip placement="bottom" title="删除">
											<Button>
												<Icon type="delete" />
											</Button>
										</Tooltip>
									</Popconfirm>
								) : (
										<Tooltip placement="bottom" title="删除">
											<Button disabled={true}>
												<Icon type="delete" />
											</Button>
										</Tooltip>
									)}
								<Tooltip placement="bottom" title="新增">
									<Button onClick={this.toCreate}>
										<Icon type="file-add" />
									</Button>
								</Tooltip>
								<Tooltip placement="bottom" title="刷新">
									<Button onClick={this.refresh}>
										<Icon type="reload" />
									</Button>
								</Tooltip>
								<Upload {...uploadOneProps}>
									<Tooltip placement="bottom" title="导入">
										<Button>
											<Icon type="import" />
										</Button>
									</Tooltip>
								</Upload>
								<Tooltip placement="bottom" title="导出">
									<Button onClick={this.toExport}>
										<Icon type="export" />
									</Button>
								</Tooltip>
							</ButtonGroup>
						</Col>
						<Col className="gutter-row" span={10} offset={4}>
							<Select
								mode="multiple"
								style={{ width: '100%' }}
								allowClear={true}
								placeholder="请选择要查看的字段"
								value={fields}
								onChange={this.onFieldsChange}
							>
								{columns.map((item) => <Option key={item.dataIndex}>{item.title}</Option>)}
							</Select>
						</Col>

						<Col className="gutter-row" span={24}>
							<Divider orientation="left">
								已选中 {selectedRows.length} 项 / 共 {list.length} 项
							</Divider>
							<Table
								rowKey="id"
								loading={loading}
								columns={tableColumns}
								onChange={this.onTableChange}
								rowSelection={rowSelection}
								pagination={pagination}
								dataSource={list}
							/>
						</Col>
					</Row>
				</Content>
			</Layout>
		);
	}
}
