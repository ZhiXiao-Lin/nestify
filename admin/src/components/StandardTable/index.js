import React, { PureComponent, Fragment } from 'react';
import { Table, Divider, Alert } from 'antd';
import styles from './index.less';

function initTotalList(columns) {
	const totalList = [];
	columns.forEach((column) => {
		if (column.needTotal) {
			totalList.push({ ...column, total: 0 });
		}
	});
	return totalList;
}

class StandardTable extends PureComponent {
	constructor(props) {
		super(props);
		const { columns } = props;
		const needTotalList = initTotalList(columns);

		this.state = {
			selectedRowKeys: [],
			needTotalList
		};
	}

	static getDerivedStateFromProps(nextProps) {
		// clean state
		if (nextProps.selectedRows.length === 0) {
			const needTotalList = initTotalList(nextProps.columns);
			return {
				selectedRowKeys: [],
				needTotalList
			};
		}
		return null;
	}

	handleRowSelectChange = (selectedRowKeys, selectedRows) => {
		let { needTotalList } = this.state;
		needTotalList = needTotalList.map((item) => ({
			...item,
			total: selectedRows.reduce((sum, val) => sum + parseFloat(val[item.dataIndex], 10), 0)
		}));
		const { onSelectRow } = this.props;
		if (onSelectRow) {
			onSelectRow(selectedRows);
		}

		this.setState({ selectedRowKeys, needTotalList });
	};

	handleTableChange = (pagination, filters, sorter) => {
		const { onChange } = this.props;
		if (onChange) {
			onChange(pagination, filters, sorter);
		}
	};

	cleanSelectedKeys = () => {
		this.handleRowSelectChange([], []);
	};

	render() {
		const { selectedRowKeys, needTotalList } = this.state;
		const { data = {}, rowKey, ...rest } = this.props;
		const { list = [], pagination } = data;

		const paginationProps = {
			showSizeChanger: true,
			showQuickJumper: true,
			...pagination
		};

		const rowSelection = {
			selectedRowKeys,
			onChange: this.handleRowSelectChange,
			getCheckboxProps: (record) => ({
				disabled: record.disabled
			})
		};

		return (
			<div className={styles.standardTable}>
				<Divider orientation="left">
					已选 {selectedRowKeys.length} / {list.length} 项
				</Divider>
				<Table
					rowKey={rowKey || 'key'}
					rowSelection={rowSelection}
					dataSource={list}
					pagination={false}
					// pagination={paginationProps}
					onChange={this.handleTableChange}
					{...rest}
				/>
			</div>
		);
	}
}

export default StandardTable;
