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
	message
} from 'antd';

import { UploadActionType, apiUploadOne } from '@/utils';

import styles from './index.css';

const { Content } = Layout;
const ButtonGroup = Button.Group;
const Option = Select.Option;
const { RangePicker } = DatePicker;

const children = [];
for (let i = 10; i < 36; i++) {
	children.push(<Option key={i.toString(36) + i}>{i.toString(36) + i}</Option>);
}

const MODEL_NAME = 'contents';
const DETAIL_URL = '/studio/newsdetail';

@connect(({ contents, loading }) => ({
	data: contents.data,
	selectedRows: contents.selectedRows,
	selectedRowKeys: contents.selectedRowKeys,
	loading: loading.models.contents
}))
@Form.create()
export default class extends React.Component {
	componentDidMount() {
		this.refresh();
	}

	componentWillReceiveProps(nextProps) {
		const { match: { params } } = nextProps;
		if (this.props.match.params.channel !== params.channel) {
			this.loadData(0, params.channel);
		}
	}

	loadData = (page, category = null) => {
		const { dispatch, match: { params } } = this.props;

		dispatch({
			type: `${MODEL_NAME}/fetch`,
			payload: {
				page,
				category: category || params.channel
			}
		});
	};

	refresh = () => {
		const { data } = this.props;
		this.loadData(data.page);
	};

	toRemove = () => {
		const { dispatch } = this.props;
		dispatch({
			type: `${MODEL_NAME}/remove`
		});
		this.refresh();
	};

	toImport = () => {
		this.refresh();
	};

	toDetail = (id) => (e) => {
		router.push(`${DETAIL_URL}/${id}`);
	};

	onTableChange = (pagination, filters, sorter, extra) => {
		console.log(pagination, filters, sorter, extra);
	};

	render() {
		const { dispatch, data, selectedRows, selectedRowKeys, loading } = this.props;
		const { getFieldDecorator } = this.props.form;

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

		const columns = [
			{
				title: '详情',
				dataIndex: 'id',
				render: (val) => <a onClick={this.toDetail(val)}>详情</a>
			},
			{
				title: '缩略图',
				dataIndex: 'thumbnail',
				render: (val) => (!val ? null : <img style={{ width: '60px' }} src={val} />)
			},
			{
				title: '标题',
				dataIndex: 'title'
			},
			{
				title: '作者',
				dataIndex: 'author'
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
			}
		];

		const pagination = {
			defaultCurrent: 1,
			current: data.page,
			pageSize: data.pageSize,
			total: data.total,
			hideOnSinglePage: true,
			showTotal: (total) => `共${total}条记录 `,
			onChange: (page) => this.loadData(page)
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
					<Form
						style={{
							padding: 5,
							marginBottom: 20
						}}
					>
						<Row type="flex" justify="start">
							<Col span={6}>
								<Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="标题">
									{getFieldDecorator('keyword')(<Input placeholder="请输入搜索关键词" />)}
								</Form.Item>
							</Col>
							<Col span={8}>
								<Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="发布时间">
									{getFieldDecorator('publish_at')(
										<RangePicker
											showTime
											format="YYYY-MM-DD HH:mm:ss"
											locale={{
												lang: {
													placeholder: 'Select date',
													rangePlaceholder: [ '开始时间', '结束时间' ],
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
							</Col>
						</Row>
						<Row type="flex" justify="start">
							<Col span={4}>
								<Button type="primary" htmlType="submit">
									<Icon type="search" />搜索
								</Button>
								<Button style={{ marginLeft: 8 }} onClick={this.handleReset}>
									<Icon type="undo" />重置
								</Button>
							</Col>
						</Row>
					</Form>
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
									<Button>
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
									<Button>
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
								defaultValue={[ 'a10', 'c12' ]}
							>
								{children}
							</Select>
						</Col>

						<Col className="gutter-row" span={24}>
							<Divider orientation="left">
								已选中 {selectedRows.length} 项 / 共 {list.length} 项
							</Divider>
							<Table
								rowKey="id"
								loading={loading}
								columns={columns}
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
