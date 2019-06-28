import React from 'react';
import UUID from 'uuid';
import { Table, Input, InputNumber, Switch, Form, Select, TreeSelect } from 'antd';

import ImageCropper from '@/components/ImageCropper';
import { apiUploadOneToQiniu } from '@/utils';
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
    const { inputType, options } = this.props;

    if ('switch' === inputType) {
      return <Switch {...options.props} />;
    } else if ('number' === inputType) {
      return <InputNumber onPressEnter={this.save} onBlur={this.save} {...options.props} />;
    } else {
      return (
        <Input ref={(node) => (this.input = node)} onPressEnter={this.save} onBlur={this.save} />
      );
    }
  };

  onUpload = async (file) => {
    const { record, dataIndex, index, handleSave } = this.props;

    const res = await apiUploadOneToQiniu(file);
    if (!!res && !!res.path) {
      const values = {};
      values[dataIndex] = res;

      handleSave(record, index, values);
    }
  };

  onSelectChange = (selecteds) => {
    const { record, dataIndex, index, handleSave } = this.props;

    const values = {};
    values[dataIndex] = selecteds;

    handleSave(record, index, values);
  };

  renderCell = (form) => {
    this.form = form;
    const { children, dataIndex, record, inputType, fieldOptions, options } = this.props;
    const { editing } = this.state;

    fieldOptions.initialValue = fieldOptions.initialValue || record[dataIndex];

    if (
      editing ||
      'switch' === inputType ||
      'number' === inputType ||
      ('text' === inputType && !record[dataIndex])
    ) {
      return (
        <Form.Item style={{ margin: 0 }}>
          {form.getFieldDecorator(dataIndex, fieldOptions)(this.getInput(inputType))}
        </Form.Item>
      );
    } else if ('treeSelect' === inputType) {
      return (
        <TreeSelect
          value={fieldOptions.initialValue}
          onChange={this.onSelectChange}
          {...options.props}
        />
      );
    } else if ('select' === inputType) {
      return (
        <Select value={fieldOptions.initialValue} onChange={this.onSelectChange} {...options.props}>
          {options.selectOptions &&
            options.selectOptions.map((item) => (
              <Option key={item.key} value={item.value}>
                {item.title}
              </Option>
            ))}
        </Select>
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

    Object.keys(values).forEach((item) => {
      record[item] = values[item];
    });

    dataSource[index] = record;

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
          options: col.options || {},
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave: this.handleSave,
        }),
      };
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
      </div>
    );
  }
}
