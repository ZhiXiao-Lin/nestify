import React, { Fragment } from 'react';
import _ from 'lodash';
import moment from 'moment';
import router from 'umi/router';
import { connect } from 'dva';
import {
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
  TreeSelect,
  Modal,
  InputNumber,
} from 'antd';

import styles from './index.css';

const { Content } = Layout;
const ButtonGroup = Button.Group;
const Option = Select.Option;
const Panel = Collapse.Panel;
const { RangePicker } = DatePicker;

const MODEL_NAME = 'users';
const DETAIL_URL = '/studio/users/detail';

@connect(({ users, user, organization, loading }) => ({
  ...users,
  currentUser: user.currentUser,
  organization,
  loading: loading.models.users,
}))
@Form.create()
export default class extends React.Component {
  state = {
    currentNode: null,
    actionType: 'add',
    value: 10,
  };

  componentDidMount() {
    this.init();
    this.onReset();
    this.refresh();
  }

  init = (channel) => {
    let columns = [];
    let fields = [];
    let showQueryCondition = false;

    switch (channel) {
      default:
        columns = [
          {
            title: '详情',
            dataIndex: 'id',
            render: (val) => <a onClick={this.toDetail(val)}>详情</a>,
          },
          {
            title: '头像',
            dataIndex: 'avatarPath',
            render: (val) => (!val ? null : <img style={{ width: '30px' }} src={val} />),
          },
          {
            title: '昵称',
            dataIndex: 'nickname',
            render: (val) => {
              const {
                queryParams: { keyword },
              } = this.props;

              const reg = new RegExp(keyword, 'gi');

              return !!keyword
                ? val
                    .toString()
                    .split(reg)
                    .map((text, i) =>
                      i > 0
                        ? [
                            <span key={i} col={i} style={{ color: 'red' }}>
                              <b>{val.toString().match(reg)[0]}</b>
                            </span>,
                            text,
                          ]
                        : text
                    )
                : val;
            },
          },
          {
            title: '账号',
            dataIndex: 'account',
          },
          {
            title: '姓名',
            dataIndex: 'realName',
          },
          {
            title: '性别',
            dataIndex: 'gender',
            render: (val) => (!_.isEmpty(val) ? '' : val <= 0 ? '男' : '女'),
          },
          {
            title: '积分',
            dataIndex: 'points',
            render: (val, row) => (row.isVolunteer ? val : '-'),
          },
          {
            title: '等级',
            dataIndex: 'vip',
            render: (val, row) => (row.isVolunteer ? `V${val}` : '-'),
          },

          {
            title: '所属',
            dataIndex: 'org',
            render: (val) => (!!val ? val.name : '-'),
          },
          {
            title: '角色',
            dataIndex: 'role.name',
          },
          {
            title: '状态',
            dataIndex: 'status',
          },
          {
            title: '修改时间',
            dataIndex: 'update_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            title: '注册时间',
            dataIndex: 'create_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            title: '操作',
            dataIndex: 'id',
            render: (val, row) => this.renderActions(row),
          },
        ];

        fields = [
          'id',
          'avatarPath',
          'nickname',
          'org',
          'points',
          'vip',
          'account',
          'realName',
          'gender',
          'role.name',
          'status',
          'create_at',
        ];
        showQueryCondition = true;
        break;
    }

    this.props.dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        columns,
        fields,
        showQueryCondition,
      },
    });
  };

  loadData = (payload) => {
    const { dispatch } = this.props;

    dispatch({
      type: `${MODEL_NAME}/fetch`,
      payload,
    });
  };

  refresh = () => {
    const { data } = this.props;
    this.loadData({ page: data.page });
  };

  toCreate = () => {
    router.push(`${DETAIL_URL}`);
  };

  toDetail = (id) => (e) => {
    router.push(`${DETAIL_URL}/${id}`);
  };

  toUpdate = (currentNode) => {
    this.setState((state) => ({
      ...state,
      currentNode,
      actionType: 'add',
      value: 10,
    }));
  };

  toRemove = () => {
    const { dispatch } = this.props;
    dispatch({
      type: `${MODEL_NAME}/remove`,
      payload: {
        callback: () => this.refresh(),
      },
    });
  };

  toExport = () => {
    const { dispatch, fields } = this.props;

    dispatch({
      type: `${MODEL_NAME}/export`,
      payload: {
        fields: fields.join(','),
      },
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
    this.props.dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        fields,
      },
    });
  };

  onSubmit = (e) => {
    e.preventDefault();

    this.props.form.validateFields((err, values) => {
      if (!!err) return false;

      if (!!values.create_at) {
        values.create_at = values.create_at
          .map((item) => moment(item).format('YYYY-MM-DD HH:mm:ss'))
          .join(',');
      }

      this.loadData({ page: 0, ...values });
    });
  };

  onReset = () => {
    this.props.form.resetFields();

    const {
      match: { params },
    } = this.props;

    this.props.dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        queryParams: {
          category: params.channel,
        },
      },
    });
  };

  toSave = (payload) => {
    const { dispatch } = this.props;

    payload.callback = (currentNode) => {
      this.setState((state) => ({
        ...state,
        currentNode,
      }));
      this.refresh();
    };

    dispatch({
      type: `${MODEL_NAME}/save`,
      payload,
    });
  };

  toApplyVolunteer = (payload) => {
    payload.callback = () => {
      this.refresh();
    };

    this.props.dispatch({
      type: `${MODEL_NAME}/apply`,
      payload,
    });
  };

  renderActions = (user) => {
    const { currentUser } = this.props;

    return (
      <Fragment>
        {!user.isSuperAdmin && user.isVolunteer ? (
          <Button type="danger" onClick={() => this.toUpdate(user)}>
            操作
          </Button>
        ) : (
          ''
        )}
        {!user.isSuperAdmin && !!currentUser.isSuperAdmin && !user.isVolunteer ? (
          <Fragment>
            {' '}
            <Button type="primary" onClick={() => this.toApplyVolunteer(user)}>
              申请
            </Button>
          </Fragment>
        ) : (
          ''
        )}
      </Fragment>
    );
  };

  render() {
    const { currentNode, actionType, value } = this.state;
    const {
      dispatch,
      data,
      organization,
      selectedRows,
      selectedRowKeys,
      columns,
      fields,
      showQueryCondition,
      loading,
    } = this.props;
    const { getFieldDecorator } = this.props.form;

    const tableColumns = columns.filter((item) => fields.includes(item.dataIndex));

    const list = data.list || [];

    const pagination = {
      defaultCurrent: 1,
      current: data.page,
      pageSize: data.pageSize,
      total: data.total,
      hideOnSinglePage: true,
      showTotal: (total) => `共${total}条记录 `,
    };

    const rowSelection = {
      selectedRowKeys,
      onChange: (selectedRowKeys, selectedRows) => {
        dispatch({
          type: `${MODEL_NAME}/set`,
          payload: {
            selectedRowKeys,
            selectedRows,
          },
        });
      },
    };

    return (
      <Layout>
        <Content className={styles.normal}>
          <Modal
            title="操作"
            visible={currentNode}
            closable
            footer={null}
            onCancel={() => this.toUpdate(null)}
          >
            {!!currentNode && (
              <Fragment>
                <p>账户: {currentNode.account}</p>
                <p>修改前积分: {currentNode.points}</p>
                <p>
                  修改后积分:{' '}
                  {actionType === 'add' ? currentNode.points + value : currentNode.points - value}
                </p>
                <p>
                  修改积分:{' '}
                  <Select
                    value={actionType}
                    onChange={(actionType) => this.setState((state) => ({ ...state, actionType }))}
                  >
                    <Option value="add">增加</Option>
                    <Option value="sub">减少</Option>
                  </Select>{' '}
                  <InputNumber
                    min={1}
                    step={1}
                    value={value}
                    onChange={(value) => this.setState((state) => ({ ...state, value }))}
                  />{' '}
                  <Button
                    type="primary"
                    disabled={actionType === 'sub' && currentNode.points - value < 0}
                    onClick={() => this.toSave({ ...currentNode, actionType, value })}
                  >
                    保存
                  </Button>
                </p>
              </Fragment>
            )}
          </Modal>
          {showQueryCondition ? (
            <Collapse defaultActiveKey={['1']}>
              <Panel header="用户管理 | 查询条件" key="1">
                <Form
                  onSubmit={this.onSubmit}
                  style={{
                    padding: 5,
                    marginBottom: 20,
                  }}
                >
                  <Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="昵称">
                    {getFieldDecorator('keyword')(<Input placeholder="请输入搜索关键词" />)}
                  </Form.Item>

                  <Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="注册时间">
                    {getFieldDecorator('create_at')(
                      <RangePicker showTime format="YYYY-MM-DD HH:mm:ss" />
                    )}
                  </Form.Item>

                  <Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="组织架构">
                    {getFieldDecorator('org')(
                      <TreeSelect
                        treeNodeFilterProp="title"
                        showSearch
                        treeDefaultExpandAll
                        treeData={organization.data}
                      />
                    )}
                  </Form.Item>
                  <Row>
                    <Col span={12} offset={3}>
                      <Button type="primary" htmlType="submit">
                        <Icon type="search" />
                        搜索
                      </Button>
                      <Button style={{ marginLeft: 8 }} onClick={this.onReset}>
                        <Icon type="undo" />
                        重置
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Panel>
            </Collapse>
          ) : (
            ''
          )}
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
                {columns.map((item) => (
                  <Option key={item.dataIndex}>{item.title}</Option>
                ))}
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
