import React, { Fragment } from 'react';
import { Row, Col, Divider, Button, Icon, Tooltip, Popconfirm, Table, Select, DatePicker, Input, Upload } from 'antd';

const gPrefix = '__$$';
const gPostFix = '$$__';
export const PopSearchBox = ({ id, inputValue, placeHolder, inputChangeHandler, confirmHandler, clearHandler }) => (
	<div className="custom-filter-dropdown">
		<Input
			id={id}
			className="table-search"
			placeholder={placeHolder}
			value={inputValue}
			onChange={inputChangeHandler}
			onPressEnter={confirmHandler}
		/>
		<div className="ant-table-filter-dropdown-btns">
			<a className="ant-table-filter-dropdown-link confirm" onClick={confirmHandler}>
				过滤
			</a>
			<a className="ant-table-filter-dropdown-link clear" onClick={clearHandler}>
				清空
			</a>
		</div>
	</div>
);

export const prepareToShowTableRow = (colFilters) => (row) => {
	const rowcopy = { ...row };
	// console.log(colFilters, row);
	for (let col of Object.keys(colFilters)) {
		if (!rowcopy[col] || !colFilters[col] || colFilters[col] === '') continue;
		// else
		let reg = new RegExp(colFilters[col], 'gi');
		if (!rowcopy[col].toString().match(reg)) return null; // invalid to show
		// else
		rowcopy[gPrefix + col + gPostFix] = rowcopy[col].toString().split(reg).map(
			(text, i) =>
				i > 0
					? [
							<span key={i} col={i} className="highlight">
								{rowcopy[col].toString().match(reg)[0]}
							</span>,
							text
						]
					: text
		);
	}
	return rowcopy; // valid to show
};

export const buildTableColumns = (
	columnsObj,
	columnsExtra,
	searchInput,
	inputChangeHandler,
	confirmHandler,
	clearHandler,
	searchDropdownVisible,
	toSetSearchVisible
) => {
	return Object.keys(columnsObj).map((keyName) => {
		const filterprops =
			!columnsObj[keyName] || !columnsObj[keyName].searchable
				? {}
				: {
						filterDropdown: (
							<PopSearchBox
								id={'table-search-' + keyName}
								placeHolder="filter"
								inputValue={searchInput[keyName]}
								inputChangeHandler={inputChangeHandler(keyName)}
								confirmHandler={confirmHandler(keyName)}
								clearHandler={clearHandler(keyName)}
							/>
						),
						filterIcon: (
							<Icon type="search" style={{ color: searchInput[keyName] != null ? '#108ee9' : '#aaa' }} />
						),
						filterDropdownVisible: searchDropdownVisible[keyName],
						onFilterDropdownVisibleChange: (visible) => toSetSearchVisible(keyName, visible),
						render: (text, row, index) => row[gPrefix + keyName + gPostFix] || text
					};
		return Object.assign(
			{
				key: keyName,
				dataIndex: keyName
			},
			columnsObj[keyName],
			columnsExtra[keyName],
			filterprops
		);
	});
};

export class DateRangePicker extends React.Component {
	state = {
		isDatePickerEndOpen: false
	};

	disabledStartDate = (startValue) => {
		const { endDate } = this.props;
		if (!startValue || !endDate) {
			return false;
		}
		return startValue.valueOf() > endDate.valueOf();
	};
	disabledEndDate = (endValue) => {
		const { startDate } = this.props;
		if (!endValue || !startDate) {
			return false;
		}
		return endValue.valueOf() <= startDate.valueOf();
	};
	onStartPickerOpenChange = (open) => {
		if (!open) {
			this.setState({ isDatePickerEndOpen: true });
		}
	};
	onEndPickerOpenChange = (open) => {
		this.setState({ isDatePickerEndOpen: open });
	};

	onDateValueChange = (name) => (value) => {
		console.log(name, value);
		if ((name === 'startDate' || name === 'endDate') && value) {
			const val = {
				startDate: { hour: 0, minute: 0, second: 0, millisecond: 0 },
				endDate: { hour: 23, minute: 59, second: 59, millisecond: 999 }
			};
			value.set(val[name]);
		}
		const { onDateChange } = this.props;
		if (!!onDateChange) onDateChange({ [name]: value });
	};

	render() {
		return (
			<Fragment>
				<DatePicker
					allowClear={true}
					format="YYYY-MM-DD"
					placeholder="日期（起）"
					onChange={this.onDateValueChange('startDate')}
					value={this.props.startDate}
					disabledDate={this.disabledStartDate}
					onOpenChange={this.onStartPickerOpenChange}
				/>
				<DatePicker
					allowClear={true}
					format="YYYY-MM-DD"
					placeholder="日期（止）"
					onChange={this.onDateValueChange('endDate')}
					value={this.props.endDate}
					disabledDate={this.disabledEndDate}
					onOpenChange={this.onEndPickerOpenChange}
					open={this.state.isDatePickerEndOpen}
				/>
			</Fragment>
		);
	}
}

export class TableActions extends React.Component {
	render() {
		const { actions, selectedRowKeys, isLoading } = this.props;
		const anyrowselected = selectedRowKeys.length > 0;

		/**
     * buttondel is here BECAUSE OF the BUG from <Popconfirm>: 
     *    even when the <Button> is disabled, the <Popconfirm> is still functional.
     */
		const buttondel = anyrowselected ? (
			<Popconfirm
				title={`是否确认要删除选中的 ${selectedRowKeys.length} 条记录？`}
				onConfirm={actions['删除']}
				okText="是"
				cancelText="否"
			>
				<Tooltip placement="bottom" title="删除">
					<Button icon="delete" />
				</Tooltip>
			</Popconfirm>
		) : (
			<Tooltip placement="bottom" title="删除">
				<Button disabled={!anyrowselected} icon="delete" />
			</Tooltip>
		);

		return (
			<Button.Group>
				{!actions['删除'] ? null : buttondel}
				{!actions['冻结'] ? null : (
					<Tooltip placement="bottom" title="冻结">
						<Button disabled={0 === selectedRowKeys.length} onClick={actions['冻结']} icon="lock" />
					</Tooltip>
				)}
				{!actions['解冻'] ? null : (
					<Tooltip placement="bottom" title="解冻">
						<Button disabled={0 === selectedRowKeys.length} onClick={actions['解冻']} icon="unlock" />
					</Tooltip>
				)}
				{!actions['新增'] ? null : (
					<Tooltip placement="bottom" title="新增">
						<Button onClick={actions['新增']} icon="file-add" />
					</Tooltip>
				)}
				{!actions['修改'] ? null : (
					<Tooltip placement="bottom" title="修改">
						<Button disabled={!anyrowselected} onClick={actions['修改']} icon="form" />
					</Tooltip>
				)}
				{!actions['刷新'] ? null : (
					<Tooltip placement="bottom" title="刷新">
						<Button loading={isLoading} disabled={isLoading} onClick={actions['刷新']} icon="reload" />
					</Tooltip>
				)}
				{!actions['导入'] ? null : (
					<Upload
						accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
						actions={null}
						showUploadList={false}
						onChange={(context) => console.log('<Upload> onChange: ', context)}
						customRequest={(context) => console.log('<Upload> customRequest: ', context)}
						beforeUpload={actions['导入']}
					>
						<Tooltip placement="bottom" title="导入">
							<Button icon="upload" />
						</Tooltip>
					</Upload>
				)}
				{!actions['出账'] ? null : (
					<Tooltip placement="bottom" title="选中订单出账">
						<Button disabled={!anyrowselected} onClick={actions['出账']} icon="folder-add" />
					</Tooltip>
				)}
				{!actions['克隆'] ? null : (
					<Tooltip placement="bottom" title="克隆">
						<Button disabled={!anyrowselected} onClick={actions['克隆']} icon="fork" />
					</Tooltip>
				)}
				{!actions['日志'] ? null : (
					<Tooltip placement="bottom" title="日志">
						<Button disabled={1 !== selectedRowKeys.length} onClick={actions['日志']} icon="audit" />
					</Tooltip>
				)}
				{!actions['日历'] ? null : (
					<Tooltip placement="bottom" title="日历视图">
						<Button onClick={actions['日历']} icon="calendar" />
					</Tooltip>
				)}
				{!actions['索引过滤'] ? null : (
					<Tooltip placement="bottom" title="索引过滤">
						<Button onClick={actions['索引过滤']} icon="compass" />
					</Tooltip>
				)}
				{!actions['创建账户'] ? null : (
					<Tooltip placement="bottom" title="创建账户">
						<Button disabled={0 === selectedRowKeys.length} onClick={actions['创建账户']} icon="wallet" />
					</Tooltip>
				)}
				{!actions['充值计提'] ? null : (
					<Tooltip placement="bottom" title="充值计提">
						<Button disabled={0 === selectedRowKeys.length} onClick={actions['充值计提']} icon="swap" />
					</Tooltip>
				)}
				{!actions['清空过滤'] ? null : (
					<Tooltip placement="bottom" title="清空过滤">
						<Button onClick={actions['清空过滤']} icon="close-circle-o" />
					</Tooltip>
				)}
			</Button.Group>
		);
	}
}

export class TableMinus extends React.Component {
	render() {
		const { tableRows, selectedRowKeys, onRowSelectionChange, tableColumns, isLoading, rowKey } = this.props;
		const anyrowselected = selectedRowKeys.length > 0;

		return (
			<Fragment>
				<Row className="select-row" gutter={6}>
					<Col className="gutter-row" span={24}>
						<Divider orientation="left">
							{anyrowselected ? (
								` 已选中 ${selectedRowKeys.length} 项 / 共 ${tableRows.length} 项`
							) : (
								` 共 ${tableRows.length} 项`
							)}{' '}
						</Divider>
					</Col>
				</Row>
				<Table
					childrenColumnName={null}
					rowSelection={{
						selectedRowKeys: selectedRowKeys,
						onChange: onRowSelectionChange
					}}
					expandedRowRender={(row) => <p>Todo: complete this component</p>}
					rowKey={rowKey || 'id'}
					columns={tableColumns}
					dataSource={tableRows}
					loading={isLoading}
					onExpandedRowsChange={(expandedRows) => console.log(`Total ${expandedRows.length} rows expanded!`)}
					footer={() => (
						<span>
							{anyrowselected ? (
								` 已选中 ${selectedRowKeys.length} 项 / 共 ${tableRows.length} 项`
							) : (
								` 共 ${tableRows.length} 项`
							)}{' '}
						</span>
					)}
				/>
			</Fragment>
		);
	}
}

export class TableFullFunction extends React.Component {
	render() {
		const {
			actions,
			isUpdating,
			rowKey,
			tableRows,
			selectedRowKeys,
			onSelectedRowKeysChange,
			tableColumns,
			selectedColumns,
			onSelectedColumnsChange
		} = this.props;
		const actionsize = Object.keys(actions).length;
		const layoutsize = parseInt(actionsize / 2, 10);
		const colwidthl = [ 6, 8, 10 ][layoutsize > 2 ? 2 : layoutsize];
		const colwidthr = 24 - colwidthl;

		// console.log(colwidthl, colwidthr);

		return (
			<Fragment>
				<Row className="handle-row" gutter={6}>
					<Col className="gutter-row" span={colwidthl}>
						<TableActions selectedRowKeys={selectedRowKeys} isLoading={isUpdating} actions={actions} />
					</Col>
					<Col className="gutter-row" span={colwidthr} style={{ textAlign: 'right' }}>
						<Select
							style={{ minWidth: 200 }}
							onChange={onSelectedColumnsChange}
							value={selectedColumns}
							allowClear
							mode="multiple"
							placeholder="可选字段"
						>
							{tableColumns.map((col) => <Select.Option key={col.key}>{col.title}</Select.Option>)}
						</Select>
					</Col>
				</Row>
				<TableMinus
					rowKey={rowKey || 'id'}
					tableRows={tableRows}
					selectedRowKeys={selectedRowKeys}
					onRowSelectionChange={onSelectedRowKeysChange}
					tableColumns={tableColumns.filter((col) => selectedColumns.indexOf(col.key) >= 0)}
					isLoading={isUpdating}
				/>
			</Fragment>
		);
	}
}

export default (WrappedComponent) => {
	class NewComponent extends React.Component {
		constructor() {
			super();
			this.state = {
				//
				selectedColumns: [],
				//
				selectedRows: [],
				selectedRowKeys: [],
				//
				tableFilter: {},
				//
				tableColSearchInput: {},
				tableColSearchDropdownVisible: {},
				//
				viewModelsValue: {}

				// importInstance                : {},
			};
		}

		onSelectedColumnsChange = (v) => {
			console.log('onSelectedColumnsChange: ', v);
			this.setState({ selectedColumns: v });
		};

		onSelectedRowKeysChange = (keys, rows) => {
			this.setState({
				selectedRows: rows,
				selectedRowKeys: keys
			});
		};

		onTableColSearchInputChange = (column) => (e) => {
			const searchinput = this.state.tableColSearchInput;
			console.log('Table Search Change', e, searchinput);

			// 防止正则匹配提前结束产生bug
			let val = e.target.value.replace(/[().^$\[\]\\]/gi, '');

			if (val === searchinput[column]) return null;
			if (val === '') val = null;
			searchinput[column] = val;
			this.setState({
				tableColSearchInput: { ...searchinput }
			});
		};
		onTableColSearchInputClear = (column) => (e) => {
			const searchinput = this.state.tableColSearchInput;
			searchinput[column] = null;
			this.setState({ tableColSearchInput: { ...searchinput } });
		};
		toSetTableColSearchVisible = (column, isVisible) => {
			const visible = this.state.tableColSearchDropdownVisible;
			visible[column] = isVisible;
			this.setState({ tableColSearchDropdownVisible: { ...visible } });
		};
		onTableColSearchConfirm = (column) => () => {
			this.toSetTableColSearchVisible(column, false);
		};
		toClearAllFilters = () => {
			this.setState({
				tableFilter: {},
				tableColSearchInput: {}
			});
		};
		toSetTableFilter = (payload) => {
			const { tableFilter } = this.state;
			console.log(tableFilter, payload);
			this.setState({
				tableFilter: { ...tableFilter, ...payload }
			});
		};

		toSetViewModelsValue = (modelList, value) => {
			const setting = this.state.viewModelsValue;
			modelList.forEach((name) => {
				setting[name] = value;
			});
			this.setState({ viewModelsValue: { ...setting } });
		};

		// toGetImportInstance = (name) => (ref) => {
		//   const inst = this.state.importInstance;
		//   inst[name] = ref;
		//   this.setState({ importInstance: inst });
		// }

		render() {
			return (
				<WrappedComponent
					{...this.props}
					//
					selectedColumns={this.state.selectedColumns}
					onSelectedColumnsChange={this.onSelectedColumnsChange}
					//
					selectedRows={this.state.selectedRows}
					selectedRowKeys={this.state.selectedRowKeys}
					onSelectedRowKeysChange={this.onSelectedRowKeysChange}
					//
					tableFilter={this.state.tableFilter}
					tableColSearchInput={this.state.tableColSearchInput}
					tableColSearchDropdownVisible={this.state.tableColSearchDropdownVisible}
					onTableColSearchInputChange={this.onTableColSearchInputChange}
					onTableColSearchInputClear={this.onTableColSearchInputClear}
					toSetTableColSearchVisible={this.toSetTableColSearchVisible}
					onTableColSearchConfirm={this.onTableColSearchConfirm}
					toClearAllFilters={this.toClearAllFilters}
					toSetTableFilter={this.toSetTableFilter}
					//
					viewModelsValue={this.state.viewModelsValue}
					toSetViewModelsValue={this.toSetViewModelsValue}
					// importInstance                = {this.state.importInstance}
					// toGetImportInstance           = {this.toGetImportInstance}
				/>
			);
		}
	}

	return NewComponent;
};
