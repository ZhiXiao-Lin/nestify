import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import router from 'umi/router';
import { connect } from 'dva';
import { Layout, Row, Col, Drawer, message, Form, Divider } from 'antd';

import TablePlus, {
	buildTableColumns,
	DateRangePicker,
	TableFullFunction,
	prepareToShowTableRow
} from '@/components/TablePlus';
import { Catalog } from '@/components/TreePlus';
import Dialog from '@/components/Dialog';

import ContentsUpdateForm from './contents.update.form';

import { upload2Backend } from '@/utils/apirequest';
import config from '../../utils/config';

import { contentCategories, contentMenu } from './contents.basic';

import styles from './contents.css';

const { Content } = Layout;

const URL_CONTENT_DETAILS = config.LOCAL_URL.CONTENT_DETAILS;

const gColumnFilterCategories = contentCategories;
const gColumnDictCategory = gColumnFilterCategories.reduce((sum, curr) => {
	sum[curr.value] = curr.text;
	return sum;
}, {});

const gReservedColumnsKeyName = ['id', 'title', 'tree_path', 'author', 'thumbnail'];

@TablePlus
@connect(({ contents, loading }) => ({
	contents: contents.records,
	treeRoot: contents.treeRoot,
	selectedNode: contents.selectedNode,
	loading: loading.models.contents
}))
@Form.create()
export default class ContentsPages extends React.Component {
	initBuildTableColumns = () => {
		const columnsobj = {
			id: {
				title: '详情',
				render: (text, row) => <a onClick={this.toRedirectToRowDetails(row.id)}>详情</a>
			},
			title: {
				title: '标题',
				sorter: (a, b) => !!a['title'] && a['title'].localeCompare(b['title'], 'zh-Hans-CN'),
				searchable: true
			},
			subtitle: {
				title: '副标题',
				sorter: (a, b) => !!a['subtitle'] && a['subtitle'].localeCompare(b['subtitle'], 'zh-Hans-CN'),
				searchable: true
			},
			author: {
				title: '作者',
				sorter: (a, b) => !!a['author'] && a['author'].localeCompare(b['author'], 'zh-Hans-CN'),
				searchable: true
			},
			tree_path: {
				title: '路径',
				sorter: (a, b) => !!a['tree_path'] && a['tree_path'].localeCompare(b['v'], 'zh-Hans-CN'),
				searchable: true
			},
			category: {
				title: '类型',
				render: (category) => gColumnDictCategory[category],
				sorter: (a, b) => !!a['category'] && a['category'].localeCompare(b['category'], 'zh-Hans-CN'),
				filters: gColumnFilterCategories,
				onFilter: (value, record) => record['category'] === value
			},
			thumbnail: {
				title: '图片',
				render: (text, row, index) =>
					!row['thumbnail'] ? null : (
						<img alt={row['thumbnail'].url} style={{ width: '60px' }} src={row['thumbnail'].url} />
					)
			},
			release_datetime: {
				title: '发布时间',
				sorter: (a, b) =>
					new Date(a['release_datetime']).getTime() < new Date(b['release_datetime']).getTime() ? -1 : 1,
				render: (text, row, index) => (text ? moment(text).format('YYYY-MM-DD HH:mm:ss') : '')
			},
			created_when: {
				title: '创建时间',
				sorter: (a, b) =>
					new Date(a['created_when']).getTime() < new Date(b['created_when']).getTime() ? -1 : 1,
				render: (text, row, index) => moment(text).format('YYYY-MM-DD HH:mm:ss')
			},
			updated_when: {
				title: '修改时间',
				sorter: (a, b) =>
					new Date(a['updated_when']).getTime() < new Date(b['updated_when']).getTime() ? -1 : 1,
				render: (text, row, index) => moment(text).format('YYYY-MM-DD HH:mm:ss')
			}
		};
		return buildTableColumns(
			columnsobj,
			{},
			this.props.tableColSearchInput,
			this.props.onTableColSearchInputChange,
			this.props.onTableColSearchConfirm,
			this.props.onTableColSearchInputClear,
			this.props.tableColSearchDropdownVisible,
			this.props.toSetTableColSearchVisible
		);
	};

	// --- component lifecycle ---
	constructor(props) {
		super();
		this.state = {
			localContents: [],
			tableColumns: [],
			dialogNewName: {
				title: '请输入新名称',
				visible: false,
				okText: '确定',
				cancelText: '取消',
				onOk: () => {
					const { addonBefore, value } = this.state.inputNewName;
					const { selectedNode } = this.props;
					this.state.dialogNewName.visible = false;
					this.setState({ ...this.state });

					this.toRename({
						source: selectedNode['tree_path'],
						target: `${addonBefore}${value}`
					});
				},
				onCancel: () => {
					this.state.dialogNewName.visible = false;
					this.setState({ ...this.state });
				},

				inputs: []
			},
			inputNewName: {
				key: 'inputNewName',
				addonBefore: null,
				value: null,
				onChange: (e) => {
					this.state.inputNewName.value = e.target.value;
					this.setState({ ...this.state });
				}
			}
		};
	}

	componentWillMount() {
		const { match: { params } } = this.props;
		this.props.dispatch({
			type: 'contents/setRoot',
			payload: contentMenu[params.channel]
		});
		this.toRefreshContents();
		this.props.onSelectedColumnsChange(gReservedColumnsKeyName);
	}

	componentWillReceiveProps(nextProps) {
		this.initState(nextProps);

		if (_.isEqual(this.props, nextProps)) return;

		const { match: { params } } = nextProps;
		if (this.props.match.params.channel !== params.channel) {
			this.props.dispatch({
				type: 'contents/setRoot',
				payload: contentMenu[params.channel]
			});
			this.toRefreshContents();
			this.props.onSelectedRowKeysChange([]);
		}
	}

	initState = ({ contents, match }) => {
		const localcontents = !contents ? [] : contents;
		this.setState({
			tableColumns: this.initBuildTableColumns(),
			localContents: localcontents
		});
	};

	// --- interactive control ---
	toCreateNew = () => {
		this.props.dispatch({
			type: 'contents/set',
			payload: { recordId: null }
		});
		router.push(`${URL_CONTENT_DETAILS}/${this.props.match.params.channel}`);
	};

	toRedirectToRowDetails = (id) => (e) => {
		this.props.dispatch({
			type: 'contents/set',
			payload: { recordId: id }
		});
		router.push(`${URL_CONTENT_DETAILS}/${this.props.match.params.channel}`);
	};

	toRefreshContents = () => {
		// const { treeRoot } = this.props;

		this.props.dispatch({
			type: 'contents/fetch'
			// payload: {
			// 	colconditions: [ { col: 'tree_path', condition: '<@', val: treeRoot.__path } ]
			// }
		});
	};

	toUpdate = (newvalue) => {
		const { selectedRowKeys } = this.props;
		if (selectedRowKeys.length === 0) return;

		this.props.dispatch({
			type: 'contents/update',
			payload: {
				criteria: {
					colsets: [
						{
							col: 'id',
							vset: selectedRowKeys
						}
					]
				},
				newvalue: newvalue
			}
		});
	};

	toShowLog = () => {
		this.props.dispatch({
			type: 'dbops/fetch',
			payload: { row_id: this.props.selectedRowKeys[0] }
		});
		this.props.toSetViewModelsValue(['DRAWER-AUDIT-LOG'], { width: 640 });
	};

	// --- render helpers

	checkFilterCondition = (item) => {
		const { treeRoot, selectedNode } = this.props;
		const filterStartDate = this.props.tableFilter.startDate;
		const filterEndDate = this.props.tableFilter.endDate;

		if (treeRoot) {
			if (!_.startsWith(item.tree_path, treeRoot.__path)) return false;
		}

		if (selectedNode) {
			if (!_.startsWith(item.tree_path, selectedNode.tree_path)) return false;
		}

		if (!item['release_datetime']) {
			return !filterStartDate && !filterEndDate;
		}

		const releasedwhen = new Date(item['release_datetime']).getTime();

		if (filterStartDate) {
			const fd = new Date(filterStartDate._d).getTime();
			if (releasedwhen < fd) return false;
		}
		if (filterEndDate) {
			const fd = new Date(filterEndDate._d).getTime();
			if (releasedwhen > fd) return false;
		}

		return true;
	};

	showDialog = () => {
		const { selectedNode } = this.props;
		if (!selectedNode || !selectedNode['tree_path']) return;

		const name = selectedNode['tree_path'].split('.').slice(-1)[0];
		const path = selectedNode['tree_path'].split('.').filter((section) => section !== name).join('.');

		this.state.inputNewName.addonBefore = !path ? path : `${path}.`;
		this.state.inputNewName.value = name;
		this.state.dialogNewName.inputs.length = 0;
		this.state.dialogNewName.inputs.push(this.state.inputNewName);
		this.state.dialogNewName.visible = true;
		this.setState({ ...this.state });
	};

	toRename = ({ source, target }) => {
		// console.log({source, target});

		if (!source || !target || source === target) return;

		this.props.dispatch({
			type: 'contents/renamePath',
			payload: { source, target }
		});
	};

	toImport = async (file) => {
		const result = await upload2Backend(file, null, null, null, {
			action: 'IMPORT',
			format: 'CONTENT'
		});

		if (result instanceof Error || !result || result.length === 0) {
			message.error('文件导入失败！');
		} else {
			this.toRefreshContents();
		}
		return false; // return false will forbidden onUploadRequest
	};

	actionHandler = {
		拖拽: (payload) => {
			this.toRename(payload);
		},
		重命名: () => {
			this.showDialog();
		},
		刷新: () => {
			this.toRefreshContents();
		},
		点选: (selectedNode) => {
			this.props.dispatch({
				type: 'contents/set',
				payload: {
					selectedNode
				}
			});
		},
		新增: () => {
			this.props.dispatch({
				type: 'contents/set',
				payload: { recordId: null }
			});
			router.push(`${URL_CONTENT_DETAILS}/${this.props.match.params.channel}`);
		},
		删除: () => {
			const { selectedNode } = this.props;
			if (!selectedNode || !selectedNode['tree_path']) return;
			this.props.dispatch({
				type: 'contents/removePath',
				payload: { path: selectedNode['tree_path'] }
			});
		}
	};

	render() {
		const { loading, treeRoot, selectedNode } = this.props;
		const { localContents, tableColumns } = this.state;
		if (!tableColumns) return <p>No data</p>;

		const tablerows = localContents
			.filter((item) => this.checkFilterCondition(item))
			.map(prepareToShowTableRow(this.props.tableColSearchInput))
			.filter((record) => !!record);

		return (
			<Layout>
				<Content className={styles.normal}>
					{/* <Header className={styles.normal}>
							</Header> */}
					<Row className="filter-row" gutter={6}>
						{!this.props.viewModelsValue['DRAWER-INDEX-FILTER'] ? null : (
							<Col className="gutter-row" span={4}>
								<DateRangePicker
									startDate={this.props.tableFilter['startDate']}
									endDate={this.props.tableFilter['endDate']}
									onDateChange={this.props.toSetTableFilter}
								/>
								<Divider />
								<Catalog
									isLoading={loading}
									onAction={this.actionHandler}
									selectedNode={selectedNode || {}}
									nodes={localContents}
									treeRoot={treeRoot}
								/>
							</Col>
						)}
						<Col className="gutter-row" span={!this.props.viewModelsValue['DRAWER-INDEX-FILTER'] ? 24 : 20}>
							<TableFullFunction
								tableRows={tablerows}
								selectedRowKeys={this.props.selectedRowKeys}
								onSelectedRowKeysChange={this.props.onSelectedRowKeysChange}
								tableColumns={tableColumns}
								selectedColumns={this.props.selectedColumns}
								onSelectedColumnsChange={this.props.onSelectedColumnsChange}
								isUpdating={loading}
								actions={{
									导入: this.toImport,
									刷新: this.toRefreshContents,
									//新增: this.toCreateNew,

									清空过滤: this.props.toClearAllFilters,
									索引过滤: () => {
										this.props.toSetViewModelsValue(
											['DRAWER-INDEX-FILTER'],
											!this.props.viewModelsValue['DRAWER-INDEX-FILTER']
										);
										this.props.dispatch({
											type: 'global/changeLayoutCollapsed',
											payload: this.props.viewModelsValue['DRAWER-INDEX-FILTER']
										});
									},
									修改: () => {
										this.props.toSetViewModelsValue(['DRAWER-UPDATE'], { width: 640 });
									}
								}}
							/>
						</Col>
					</Row>
				</Content>

				{!this.state.dialogNewName.visible ? null : <Dialog {...this.state.dialogNewName} />}
			</Layout>
		);
	}
}
