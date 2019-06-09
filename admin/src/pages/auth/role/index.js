import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import router from 'umi/router';
import { connect } from 'dva';
import {
  Upload,
  Input,
  TreeSelect,
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
  message,
} from 'antd';

import { UploadActionType, apiUploadOne } from '@/utils';

import styles from './index.css';

const { Content } = Layout;
const ButtonGroup = Button.Group;
const Option = Select.Option;
const Panel = Collapse.Panel;

const MODEL_NAME = 'role';
const DETAIL_URL = '/studio/roledetail';

@connect(({ role, loading }) => ({
  ...role,
  loading: loading.models.role,
}))
@Form.create()
export default class extends React.Component {
  componentDidMount() {
    const {
      match: { params },
    } = this.props;

    this.init(params.channel);
    this.onReset();
    this.refresh();
  }

  componentWillReceiveProps(nextProps) {
    const {
      match: { params },
    } = nextProps;
    if (this.props.match.params.channel !== params.channel) {
      this.init(params.channel);
      this.loadData({ page: 0, category: params.channel });
    }
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
            title: '名称',
            dataIndex: 'name',
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
            title: '标识',
            dataIndex: 'token',
          },
          {
            title: '描述',
            dataIndex: 'desc',
          },
          {
            title: '排序',
            dataIndex: 'sort',
            sorter: true,
          },
          {
            title: '修改时间',
            dataIndex: 'update_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            title: '创建时间',
            dataIndex: 'create_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
        ];

        fields = ['id', 'name', 'token', 'desc', 'sort', 'update_at', 'create_at'];
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
    const {
      dispatch,
      match: { params },
    } = this.props;

    payload.category = !!payload.category ? payload.category : params.channel;

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
    router.push(`${DETAIL_URL}/CREATE`);
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

  onOrganizationSearch = (e) => {
    console.log(e);
  };

  renderTreeNodes = (data) =>
    data
      .sort((a, b) => a.sort - b.sort)
      .map((item) => {
        if (item.children) {
          return (
            <TreeNode title={item.name} key={item.id} dataRef={item}>
              {this.renderTreeNodes(item.children)}
            </TreeNode>
          );
        }
        return <TreeNode {...item} />;
      });

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

    const uploadOneProps = {
      name: 'file',
      action: null,
      accept:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel',
      showUploadList: false,
      beforeUpload: async (file) => {
        message.loading('正在执行导入', 0);
        await apiUploadOne(file, { action: UploadActionType.IMPORT, target: 'role' });

        setTimeout(() => {
          message.destroy();
          message.success('导入成功');
          this.refresh();
        }, 3000);

        return false;
      },
    };

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
          {showQueryCondition ? (
            <Collapse defaultActiveKey={['1']}>
              <Panel header="查询条件" key="1">
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
          <Row>
            <Col className="gutter-row" span={24}>
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
                    {/* <Upload {...uploadOneProps}>
									<Tooltip placement="bottom" title="导入">
										<Button>
											<Icon type="import" />
										</Button>
									</Tooltip>
								</Upload>
								<Tooltip placement="bottom" title="导出">
									<Button onClick={this.toExport}>
										<Icon type="export" />
									</Button>
								</Tooltip> */}
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
              </Row>
              <Row className="filter-row" gutter={6}>
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
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }
}
