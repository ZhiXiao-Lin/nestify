import React from 'react';
import _ from 'lodash';
import { connect } from 'dva';
import {
  Tabs,
  Input,
  InputNumber,
  Layout,
  Row,
  Col,
  Form,
  Button,
  Divider,
  Tree
} from 'antd';


import styles from './index.css';

const { TreeNode } = Tree;
const { Content } = Layout;

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } }
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } }
};

const MODEL_NAME = 'category';

@connect(({ category, loading }) => ({
  ...category,
  loading: loading.models.category
}))
@Form.create()
export default class extends React.Component {

  state = {
    tabKey: 'basic',
    expandedKeys: [],
    autoExpandParent: true
  };

  componentDidMount() {
    this.refresh();
  }

  componentWillReceiveProps(nextProps) {
    const { match: { params } } = nextProps;
    if (this.props.match.params.channel !== params.channel) {
      this.loadData({ page: 0, category: params.channel });
    }
  }

  onTabChange = (tabKey) => {
    this.setState({ tabKey });
  };

  loadData = (payload) => {
    const { dispatch, match: { params } } = this.props;

    payload.category = !!payload.category ? payload.category : params.channel;

    dispatch({
      type: `${MODEL_NAME}/fetch`,
      payload
    });
  };

  refresh = () => {
    const { data } = this.props;
    this.loadData({ page: data.page });
  };

  onSelect = (selectedKeys) => {
    const { dispatch, form: { setFieldsValue } } = this.props;

    if (selectedKeys.length > 0) {

      const id = selectedKeys[0];

      dispatch({
        type: `${MODEL_NAME}/detail`,
        payload: {
          id,
          callback: (val) => setFieldsValue(val)
        }
      })
    }

  };

  renderTreeNodes = data =>
    data.sort((a, b) => a.sort - b.sort).map(item => {
      if (item.children) {
        return (
          <TreeNode title={item.name} key={item.id} dataRef={item}>
            {this.renderTreeNodes(item.children)}
          </TreeNode>
        );
      }
      return <TreeNode {...item} />;
    });


  submitHandler = (e) => {
    e.preventDefault();

    const { dispatch } = this.props;

    this.props.form.validateFields((err, values) => {
      if (!!err || Object.keys(values).length === 0) {
        return;
      }

      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: values
      });
    });

  };

  renderBasicForm = () => {
    const { selectedNode, form: { getFieldDecorator } } = this.props;

    return (
      <Form onSubmit={this.submitHandler} className="panel-form">

        <Form.Item {...formItemLayout} label="名称">
          {getFieldDecorator('name', {
            initialValue: !selectedNode ? null : selectedNode['name'],
            rules: [
              {
                required: true,
                message: '名称不能为空'
              }
            ]
          })(<Input disabled {...formItemStyle} type="text" placeholder="请填写名称" />)}
        </Form.Item>

        <Form.Item {...formItemLayout} label="排序">
          {getFieldDecorator('sort', {
            initialValue: !selectedNode ? 0 : selectedNode['sort']
          })(<InputNumber min={0} {...formItemStyle} placeholder="请填写排序" />)}
        </Form.Item>

        <Form.Item {...tailFormItemLayout}>
          <Row>
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

  onExpand = expandedKeys => {
    this.setState({
      expandedKeys,
      autoExpandParent: false,
    });
  };

  render() {
    const { data, selectedNode } = this.props

    return (
      <Layout>
        <Content className={styles.normal}>
          <Row className="filter-row" gutter={6}>
            <Col className="gutter-row" span={6}>
              <Divider orientation="left" >文章分类</Divider>
              <Tree
                showLine
                onExpand={this.onExpand}
                expandedKeys={this.state.expandedKeys}
                autoExpandParent={this.state.autoExpandParent}
                onCheck={this.onCheck}
                onSelect={this.onSelect}
              >
                {this.renderTreeNodes(data)}
              </Tree>
            </Col>
            <Col className="gutter-row" span={14} offset={1}>
              {!!selectedNode ?
                <Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
                  <Tabs.TabPane tab="基本信息" key="basic">
                    {this.renderBasicForm()}
                  </Tabs.TabPane>
                </Tabs> : ''}
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }
}
