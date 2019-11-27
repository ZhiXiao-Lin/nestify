import React from 'react';
import { Link } from 'react-router-dom';
import { Table, Divider, Popover, Popconfirm } from 'antd';

class DataTable extends React.Component {
  createColumns() {
    const { onDelete } = this.props;

    const columns = [{
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Link to={`/project/exchangemgr/datareport/${record.id}`}>{text}</Link>
    }, {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    }, {
      title: '类型',
      dataIndex: 'type.name',
      key: 'type'
    }, {
      title: '子类型',
      dataIndex: 'subType.name',
      key: 'subType'
    }, {
      title: 'logo',
      dataIndex: 'logoUrl',
      key: 'logoUrl',
      render: text => (
        <Popover content={<img width="400" src={text} alt="" />} trigger="click">
          <img width="40" height="40" src={text} alt="" />
        </Popover>
      )
    }, {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (text) => {
        const map = {
          0: '进行中',
          1: '暂停',
          2: '结束'
        };
        return map[text];
      }
    }, {
      title: '操作',
      dataIndex: 'id',
      key: 'id',
      render: (text, record) => (
        <span>
          <Link to={`/project/datareport/${text}`}>报表</Link>
          <Divider type="vertical" />
          <Link to={`/project/form/step/${text}`}>修改</Link>
          {
            record.state === 2 && (
              <React.Fragment>
                <Divider type="vertical" />
                <Popconfirm title="确定删除吗?" onConfirm={() => onDelete(text, record)} okText="确定" cancelText="取消">
                  <a href="javascript:;" style={{ color: 'red' }}>删除</a>
                </Popconfirm>
              </React.Fragment>
            )
          }
        </span>
      )
    }];

    return columns;
  }

  render() {
    const { data } = this.props;

    return <Table columns={this.createColumns()} dataSource={data} rowKey="id" />;
  }
}

export default DataTable;
