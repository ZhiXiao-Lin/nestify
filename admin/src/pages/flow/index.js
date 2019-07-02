import React, { Fragment } from 'react';
import _ from 'lodash';
import moment from 'moment';
import router from 'umi/router';
import { connect } from 'dva';
import {
  Input,
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
  Badge,
  Popconfirm,
  Collapse,
  Modal,
} from 'antd';

import styles from './index.css';

import UserSelector from '@/components/UserSelector';
import { WFStatus, WFResult, FlowOperationsEnum } from '@/utils/enum';

const { Content } = Layout;
const ButtonGroup = Button.Group;
const Option = Select.Option;
const Panel = Collapse.Panel;

const MODEL_NAME = 'flow';
const DETAIL_URL = '/studio/flow/detail';

@connect(({ flow, user, loading }) => ({
  ...flow,
  currentUser: user.currentUser,
  loading: loading.models.flow,
}))
@Form.create()
export default class extends React.Component {

  state = {
    remarksModalTitle: '请输入理由',
    remarksVisible: false,
    remarks: '',
    currentNode: null,
    currentAction: null,

    selectionDrawerVisible: false,
  }

  componentDidMount() {
    this.init();
    this.onReset();
    this.refresh();
  }

  init = () => {
    const columns = [
      {
        title: '工单ID',
        dataIndex: 'id',
      },
      {
        title: '名称',
        dataIndex: 'template.name',
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
        title: '任务状态',
        dataIndex: 'state',
      },
      {
        title: '状态',
        dataIndex: 'wfStatus',
        render: (val) => this.renderWFStatus(val),
      },
      {
        title: '结果',
        dataIndex: 'wfResult',
        render: (val) => this.renderWFResult(val),
      },
      {
        title: '申请人',
        dataIndex: 'user.account',
      },
      {
        title: '执行人',
        dataIndex: 'executor.account',
      },
      {
        title: '操作人',
        dataIndex: 'operator.account',
      },
      {
        title: '操作时间',
        dataIndex: 'update_at',
        sorter: true,
        render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '申请时间',
        dataIndex: 'create_at',
        sorter: true,
        render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '操作',
        dataIndex: 'ExecutableTasks',
        render: (val, row) => this.renderActions(val, row),
      },
    ];

    const fields = [
      'id',
      'template.name',
      'state',
      'wfStatus',
      'wfResult',
      'user.account',
      'executor.account',
      'operator.account',
      'update_at',
      'ExecutableTasks',
    ];

    this.props.dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        columns,
        fields,
        showQueryCondition: true,
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
    const { dispatch } = this.props;

    dispatch({
      type: `${MODEL_NAME}/export`,
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

  onAction = (action, flow, options = {}, callback = () => this.refresh()) => {
    options.operator = this.props.currentUser;

    this.props.dispatch({
      type: `${MODEL_NAME}/dispatch`,
      payload: {
        action,
        flow,
        options,
        callback
      },
    });
  };

  renderWFStatus = (status) => {
    switch (status) {
      case WFStatus.RUNNING:
        return <Badge status="warning" text="进行中" />;
      case WFStatus.OVER:
        return <Badge status="success" text="已完成" />;
      case WFStatus.CANCELED:
        return <Badge status="default" text="已取消" />;
      default:
        return '';
    }
  };

  renderWFResult = (resut) => {
    switch (resut) {
      case WFResult.SUCCESS:
        return <Badge status="success" text="成功" />;
      case WFResult.RUNNING:
        return <Badge status="warning" text="进行中" />;
      case WFResult.FAILURE:
        return <Badge status="error" text="失败" />;
      default:
        return '';
    }
  };

  renderOperations = () => {
    return <Fragment>
      <Modal
        title={this.state.remarksModalTitle}
        visible={this.state.remarksVisible}
        footer={null}
        onCancel={() => this.setState(state => ({ ...state, remarksVisible: false }))}
      >
        <p>
          <Input
            value={this.state.remarks}
            onChange={e => { e.persist(); this.setState(state => ({ ...state, remarks: !!e.target ? e.target.value : '' })) }}
            placeholder={this.state.remarksModalTitle} />
        </p>
        <p style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            disabled={!this.state.remarks}
            onClick={
              () => this.onAction(this.state.currentAction, this.state.currentNode, { remarks: this.state.remarks }, () => {
                this.setState(state => ({ ...state, remarksVisible: false }));
                this.refresh();
              })
            }>
            {this.state.currentAction}
          </Button>
        </p>
      </Modal>
      <UserSelector
        visible={this.state.selectionDrawerVisible}
        onClose={() => this.setState(state => ({ ...state, selectionDrawerVisible: false }))} />
    </Fragment>
  }

  renderAction = (index, action, row) => {
    if (WFResult.RUNNING !== row.wfResult) return '';
    const operations = row.template.operations[row.state];

    if (!!operations) {
      switch (operations[action]) {
        case FlowOperationsEnum.REMARKS:
          return <Button key={index} type="primary" ghost onClick={() =>
            this.setState(state => ({
              ...state, remarksVisible: true, currentNode: row, currentAction: action, remarks: ''
            }))}>
            {action}
          </Button>
        case FlowOperationsEnum.ALLOCATION:
          return <Button key={index} type="primary" ghost onClick={() =>
            this.setState(state => ({
              ...state, selectionDrawerVisible: true, currentNode: row, currentAction: action
            }))}>
            {action}
          </Button>
      }
    }

    return (
      <Popconfirm
        key={index}
        title={`确认要执行${action}吗？`}
        okText="是"
        cancelText="否"
        onConfirm={() => this.onAction(action, row)}
      >
        <Button type="primary" ghost>
          {action}
        </Button>
      </Popconfirm>
    );
  };

  renderActions = (actions, row) => {
    return <Button.Group>{actions.map((action, index) => this.renderAction(index, action, row))}</Button.Group>;
  };

  render() {
    const {
      dispatch,
      data,
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
          {this.renderOperations()}
          {showQueryCondition ? (
            <Collapse defaultActiveKey={['1']}>
              <Panel header="工作流 | 查询条件" key="1">
                <Form
                  onSubmit={this.onSubmit}
                  style={{
                    padding: 5,
                    marginBottom: 20,
                  }}
                >
                  <Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="标题">
                    {getFieldDecorator('keyword')(<Input placeholder="请输入搜索关键词" />)}
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
