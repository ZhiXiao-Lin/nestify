import React from 'react';
import { isEmpty, merge } from 'lodash';
import UUID from 'uuid';
import { Table, Input, Button, Form, Popconfirm, Select, Icon } from 'antd';

import ImageCropper from '@/components/ImageCropper';
import { apiUploadOne } from '@/utils';
import { getFullPath } from '@/utils/utils';

const { Option } = Select;
const EditableContext = React.createContext();

const EditableRow = ({ form, index, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);

class EditableCell extends React.Component {
  state = {
    editing: false,
  };

  toggleEdit = () => {
    const editing = !this.state.editing;
    this.setState({ editing }, () => {
      if (editing) {
        if (!!this.input) {
          this.input.focus();
        }
      }
    });
  };

  save = (e) => {
    const { record, index, handleSave } = this.props;
    this.form.validateFields((error, values) => {
      if (error && error[e.currentTarget.id]) {
        return;
      }

      this.toggleEdit();

      handleSave(record, index, values);
    });
  };

  getInput = () => {
    const { selectOptions, inputType } = this.props;
    if ('select' === inputType) {
      return (
        <Select style={{ width: 120 }}>
          {selectOptions &&
            selectOptions.map((item) => (
              <Option key={item.key} value={item.value}>
                {item.value}
              </Option>
            ))}
        </Select>
      );
    } else {
      return (
        <Input ref={(node) => (this.input = node)} onPressEnter={this.save} onBlur={this.save} />
      );
    }
  };

  onUpload = async (file) => {
    const { record, index, handleSave } = this.props;

    const res = await apiUploadOne(file);
    if (!!res && !!res.path) {
      handleSave(record, index, { image: res });
    }
  };

  renderCell = (form) => {
    this.form = form;
    const { children, dataIndex, record, inputType, fieldOptions } = this.props;
    const { editing } = this.state;

    if (editing || 'select' === inputType || ('text' === inputType && !record[dataIndex])) {
      fieldOptions.initialValue = fieldOptions.initialValue || record[dataIndex];

      return (
        <Form.Item style={{ margin: 0 }}>
          {form.getFieldDecorator(dataIndex, fieldOptions)(this.getInput(inputType))}
        </Form.Item>
      );
    } else if ('image' === inputType) {
      return (
        <ImageCropper
          url={getFullPath(record[dataIndex])}
          onUpload={this.onUpload}
          {...fieldOptions}
        />
      );
    } else {
      return (
        <div
          className="editable-cell-value-wrap"
          style={{ paddingRight: 24 }}
          onClick={this.toggleEdit}
        >
          {children}
        </div>
      );
    }
  };

  render() {
    const {
      editable,
      dataIndex,
      title,
      record,
      index,
      handleSave,
      children,
      ...restProps
    } = this.props;
    return (
      <td {...restProps}>
        {editable ? (
          <EditableContext.Consumer>{this.renderCell}</EditableContext.Consumer>
        ) : (
            children
          )}
      </td>
    );
  }
}

export default class EditableTable extends React.Component {
  state = {
    columns: [],
    dataSource: [],
  };

  componentDidMount() {
    const { dataSource, columns } = this.props;

    this.setState((state) => ({
      ...state,
      dataSource: dataSource.map((item) => {
        item.id = item.id ? item.id : UUID.v4();
        return item;
      }),
      columns,
    }));
  }

  handleAdd = () => {
    const { columns, dataSource } = this.state;

    let newRow = {
      id: UUID.v4(),
    };
    columns.forEach((item) => {
      newRow[item.dataIndex] = item.fieldOptions ? item.fieldOptions.initialValue : '';
    });

    dataSource.push(newRow);

    this.setState((state) => ({
      ...state,
      dataSource,
    }));
  };

  handleDelete = (id) => {
    const { dataSource } = this.state;

    this.setState((state) => ({
      ...state,
      dataSource: dataSource.filter((item) => item.id !== id),
    }));
  };

  handleSave = (record, index, values) => {
    const { dataSource } = this.state;

    dataSource[index] = merge(record, values);

    this.setState((state) => ({
      ...state,
      dataSource,
    }));
  };

  render() {
    const { columns, dataSource } = this.state;

    const components = {
      body: {
        row: EditableFormRow,
        cell: EditableCell,
      },
    };
    const tableColums = columns.map((col) => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: (record, index) => ({
          record,
          index,
          editable: col.editable,
          inputType: col.inputType || 'text',
          fieldOptions: col.fieldOptions || {},
          selectOptions: col.selectOptions,
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave: this.handleSave,
        }),
      };
    });

    tableColums.push({
      title: '操作',
      key: 'id',
      dataIndex: 'id',
      render: (val, row) => (
        <Popconfirm
          title="确定要删除吗?"
          okText="确定"
          cancelText="取消"
          onConfirm={() => this.handleDelete(val)}
        >
          <a href="javascript:;">删除</a>
        </Popconfirm>
      ),
    });

    return (
      <div>
        <Table
          components={components}
          rowClassName={() => 'editable-row'}
          rowKey="id"
          bordered
          dataSource={dataSource}
          columns={tableColums}
          pagination={false}
        />
        <Button type="dashed" onClick={this.handleAdd} block style={{ marginTop: 10 }}>
          <Icon type="plus" />
          新增
        </Button>
      </div>
    );
  }
}
