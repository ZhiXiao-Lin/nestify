import React, { Fragment } from 'react';
import { connect } from 'dva';
import router from 'umi/router';
import { Form, Input, Row, Col, Icon, Tabs, Button, Skeleton, Divider } from 'antd';

import FlowStepTable from '@/components/FlowStepTable';

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const MODEL_NAME = 'flow';

@Form.create()
@connect(({ flow, role }) => ({
  role,
  selectedNode: flow.selectedNode,
  columns: flow.columns,
}))
export default class extends React.Component {
  state = {
    tabKey: 'basic',
  };

  componentDidMount() {
    this.loadData();
  }

  componentWillReceiveProps(nextProps) {
    const {
      match: { params },
    } = nextProps;
    if (this.props.match.params.id !== params.id) {
      this.loadData(params.id);
    }
  }

  onTabChange = (tabKey) => {
    this.setState({ tabKey });
  };

  loadData = (id) => {
    const {
      dispatch,
      match: { params },
    } = this.props;

    if (!!params.id) {
      dispatch({
        type: `${MODEL_NAME}/detail`,
        payload: {
          id: id || params.id,
        },
      });
    } else {
      dispatch({
        type: `${MODEL_NAME}/set`,
        payload: {
          selectedNode: {},
        },
      });
    }

    dispatch({
      type: 'role/fetch',
      payload: {
        pageSize: 1000,
      },
    });
  };

  resetHandler = () => {
    this.props.form.resetFields();
  };

  submitHandler = (e) => {
    e.preventDefault();

    const { dispatch } = this.props;

    this.props.form.validateFields((err, values) => {
      if (!!err || Object.keys(values).length === 0) {
        return;
      }

      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: values,
      });
    });
  };

  renderBasicForm = () => {
    const {
      selectedNode,
      form: { getFieldDecorator },
    } = this.props;

    return (
      <Form onSubmit={this.submitHandler} className="panel-form">
        <Form.Item {...formItemLayout} label="名称">
          {getFieldDecorator('name', {
            initialValue: !selectedNode ? null : selectedNode['name'],
            rules: [
              {
                required: true,
                message: '名称不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写名称" />)}
        </Form.Item>

        <Form.Item {...tailFormItemLayout}>
          <Row>
            <Col span={3}>
              <Button onClick={this.resetHandler}>重置</Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit">
                {!selectedNode['id'] ? '新增' : '保存'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    );
  };

  toSaveFlowSteps = () => {
    const { selectedNode } = this.props;
    const flowSteps = selectedNode.ex_info.flowSteps || [];

    selectedNode.ex_info.flowSteps = flowSteps.map((item) => ({
      name: item.name,
      steps: this[`flow${item.name}Ref`].state.dataSource,
    }));

    this.toSave({
      ex_info: selectedNode.ex_info,
    });
  };

  toSave = (payload) => {
    this.props.dispatch({
      type: `${MODEL_NAME}/save`,
      payload,
    });
  };

  render() {
    const { selectedNode, role } = this.props;

    if (!selectedNode) return <Skeleton active loading />;

    const flowSteps = selectedNode.ex_info.flowSteps || [];
    const roles = role.data.list || [];

    return (
      <Fragment>
        <Button onClick={() => router.go(-1)}>
          <Icon type="arrow-left" />
          返回
        </Button>
        <Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
          <Tabs.TabPane key="basic" tab="基础设置">
            {this.renderBasicForm()}
          </Tabs.TabPane>
          <Tabs.TabPane key="flowSteps" tab="流程步骤">
            <Button type="primary" style={{ marginBottom: 10 }} onClick={this.toSaveFlowSteps}>
              保存
            </Button>
            {flowSteps.map((item, index) => {
              return (
                <Fragment>
                  <Divider orientation="left">{item.name}</Divider>
                  <FlowStepTable
                    ref={(e) => (this[`flow${item.name}Ref`] = e)}
                    key={index}
                    columns={[
                      {
                        title: '名称',
                        dataIndex: 'name',
                      },
                      {
                        title: '角色要求',
                        editable: true,
                        dataIndex: 'role',
                        inputType: 'treeSelect',
                        options: {
                          props: {
                            style: { width: 300 },
                            allowClear: true,
                            multiple: true,
                            treeCheckable: true,
                            treeNodeFilterProp: 'title',
                            showSearch: true,
                            treeDefaultExpandAll: true,
                            treeData: roles.map((item) => ({
                              key: item.id,
                              value: item.id,
                              title: item.name,
                            })),
                          },
                        },
                      },
                      {
                        title: '顺序',
                        dataIndex: 'sort',
                        editable: true,
                        inputType: 'number',
                        fieldOptions: {
                          initialValue: 0,
                        },
                        options: {
                          props: {
                            min: 0,
                          },
                        },
                      },
                    ]}
                    dataSource={item.steps}
                  />
                </Fragment>
              );
            })}
          </Tabs.TabPane>
        </Tabs>
      </Fragment>
    );
  }
}
