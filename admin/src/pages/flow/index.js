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
  Descriptions,
  message,
} from 'antd';

import styles from './index.css';

import UserSelector from '@/components/UserSelector';
import { WFStatus, WFResult, FlowOperationsEnum, FlowTemplateEnum } from '@/utils/enum';

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

    userSelectorVisible: false,
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
        title: '申请者',
        dataIndex: 'user.account',
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

  onSelectUser = (executor) => {
    if (!executor.isVolunteer) {
      message.error('请选择一位志愿者');
      return false;
    }

    this.onAction(this.state.currentAction, this.state.currentNode, { executor }, () => {
      this.setState(state => ({ ...state, userSelectorVisible: false }));
      this.refresh();
    })
  }

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
        visible={this.state.userSelectorVisible}
        onSelect={this.onSelectUser}
        onClose={() => this.setState(state => ({ ...state, userSelectorVisible: false }))} />
    </Fragment>
  }

  renderAction = (index, action, row) => {
    if (WFResult.RUNNING !== row.wfResult) return '';

    const flowStep = row.template.ex_info.flowSteps.find(item => item.name === row.state);

    if (!!flowStep) {
      const step = flowStep.steps.find(item => item.name === action);
      const operation = step.operation;

      if (!!operation) {
        switch (operation) {
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
                ...state, userSelectorVisible: true, currentNode: row, currentAction: action
              }))}>
              {action}
            </Button>
        }
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

  renderExpandedRow = (row) => {
    return (
      <Fragment>
        <Descriptions title="[工单信息]">
          <Descriptions.Item label="流程类型">{row.template.name}</Descriptions.Item>
          <Descriptions.Item label="当前状态">{row.state}</Descriptions.Item>
          <Descriptions.Item label="申请者账户">{row.user.account}</Descriptions.Item>
          <Descriptions.Item label="下单时间">{moment(row.create_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
        </Descriptions>
        {row.template.template === FlowTemplateEnum.APPLY_VR ?
          <Descriptions title="[申请者]">
            <Descriptions.Item label="申请者姓名">{row.user.realName}</Descriptions.Item>
            <Descriptions.Item label="申请者联系电话">{row.user.phone}</Descriptions.Item>
            <Descriptions.Item label="申请者身份证号">{row.user.idCard}</Descriptions.Item>
            <Descriptions.Item label="申请者联系地址">{row.user.address}</Descriptions.Item>
          </Descriptions> : ''}
        {row.template.template === FlowTemplateEnum.WORK_OR ?
          <Descriptions title="[服务信息]">
            <Descriptions.Item label="服务标题">{row.ex_info.service.title}</Descriptions.Item>
            <Descriptions.Item label="服务类型">{row.ex_info.service.category.name}</Descriptions.Item>
            <Descriptions.Item label="申请者姓名">{row.ex_info.realName}</Descriptions.Item>
            <Descriptions.Item label="申请者联系电话">{row.ex_info.phone}</Descriptions.Item>
            <Descriptions.Item label="申请者联系地址">{row.ex_info.address}</Descriptions.Item>
            <Descriptions.Item label="要求服务时间">{row.ex_info.date ? moment(row.ex_info.date).format('YYYY-MM-DD HH:mm:ss') : ''}</Descriptions.Item>
            <Descriptions.Item label="特殊要求">{row.ex_info.other}</Descriptions.Item>
          </Descriptions> : ''}
        {!!row.executor ?
          <Descriptions title="[执行者]">
            <Descriptions.Item label="账户">{row.executor.account}</Descriptions.Item>
            <Descriptions.Item label="昵称">{row.executor.nickname}</Descriptions.Item>
            <Descriptions.Item label="姓名">{row.executor.realName}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{row.executor.phone}</Descriptions.Item>
            <Descriptions.Item label="联系地址">{row.executor.address}</Descriptions.Item>
            <Descriptions.Item label="等级">V{row.executor.vip}</Descriptions.Item>
            <Descriptions.Item label="积分">{row.executor.points}</Descriptions.Item>
          </Descriptions> : ''}
        {!!row.operator ?
          <Descriptions title="[最后操作者]">
            <Descriptions.Item label="账户">{row.operator.account}</Descriptions.Item>
            <Descriptions.Item label="昵称">{row.operator.nickname}</Descriptions.Item>
            <Descriptions.Item label="姓名">{row.operator.realName}</Descriptions.Item>
            <Descriptions.Item label="最后操作时间">{moment(row.update_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          </Descriptions> : ''}
      </Fragment>
    );
  }

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
                expandedRowRender={this.renderExpandedRow}
              />
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }
}
