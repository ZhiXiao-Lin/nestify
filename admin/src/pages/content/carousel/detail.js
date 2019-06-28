import React, { Fragment } from 'react';
import { connect } from 'dva';
import router from 'umi/router';
import { Form, Input, Row, Col, Icon, Tabs, Button, Skeleton } from 'antd';

import EditableTable from '@/components/EditableTable';

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const MODEL_NAME = 'carousel';

@Form.create()
@connect(({ carousel }) => ({
  selectedNode: carousel.selectedNode,
  columns: carousel.columns,
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
        <Form.Item {...formItemLayout} label="标识">
          {getFieldDecorator('token', {
            initialValue: !selectedNode ? null : selectedNode['token'],
            rules: [
              {
                required: true,
                message: '标识不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写标识" />)}
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

  toSaveCarousels = () => {
    const { selectedNode } = this.props;
    selectedNode.ex_info.carousels = this.carouselsRef.state.dataSource;

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
    const { selectedNode } = this.props;

    if (!selectedNode) return <Skeleton active loading />;

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
          {!selectedNode.id ? null : (
            <Tabs.TabPane key="carousel" tab="轮播图">
              <Button type="primary" style={{ marginBottom: 10 }} onClick={this.toSaveCarousels}>
                保存
              </Button>
              <EditableTable
                ref={(e) => (this.carouselsRef = e)}
                rowsKey="id"
                columns={[
                  {
                    title: '图片',
                    key: 'image',
                    dataIndex: 'image',
                    editable: true,
                    inputType: 'image',
                    fieldOptions: {
                      width: 355,
                      height: 135,
                      initialValue: null,
                    },
                  },
                  {
                    title: '描述',
                    dataIndex: 'desc',
                    editable: true,
                    fieldOptions: {
                      initialValue: '描述',
                    },
                  },
                  {
                    title: '链接',
                    dataIndex: 'url',
                    editable: true,
                    fieldOptions: {
                      initialValue: 'http://',
                    },
                  },
                  {
                    title: '排序',
                    dataIndex: 'sort',
                    editable: true,
                    fieldOptions: {
                      initialValue: '0',
                    },
                  },
                ]}
                dataSource={selectedNode.ex_info.carousels || []}
              />
            </Tabs.TabPane>
          )}
        </Tabs>
      </Fragment>
    );
  }
}
