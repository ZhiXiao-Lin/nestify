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
  Icon,
  Button,
  Drawer,
  Popconfirm,
  Tooltip,
  Menu,
  Tree,
  message,
} from 'antd';

import styles from './index.css';

const { TreeNode } = Tree;
const { Content } = Layout;
const ButtonGroup = Button.Group;

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const MODEL_NAME = 'organization';

@connect()
@Form.create()
class CreateForm extends React.Component {
  submitHandler = (e) => {
    e.preventDefault();

    const { dispatch, onClose } = this.props;

    this.props.form.validateFields((err, values) => {
      if (!!err || Object.keys(values).length === 0) {
        return;
      }

      dispatch({
        type: `${MODEL_NAME}/create`,
        payload: values,
      });

      onClose();
    });
  };

  render() {
    const {
      visible,
      onClose,
      form: { getFieldDecorator },
    } = this.props;

    return (
      <Drawer
        title="新增节点"
        placement="right"
        width={500}
        closable
        maskClosable
        onClose={onClose}
        visible={visible}
      >
        <Form onSubmit={this.submitHandler} className="panel-form">
          <Form.Item {...formItemLayout} label="名称">
            {getFieldDecorator('name', {
              rules: [
                {
                  required: true,
                  message: '名称不能为空',
                },
              ],
            })(<Input {...formItemStyle} type="text" placeholder="请填写名称" />)}
          </Form.Item>

          <Form.Item {...formItemLayout} label="描述">
            {getFieldDecorator('desc')(
              <Input {...formItemStyle} type="text" placeholder="请填写描述" />
            )}
          </Form.Item>

          <Form.Item {...formItemLayout} label="排序">
            {getFieldDecorator('sort', {
              initialValue: 0,
            })(<InputNumber min={0} {...formItemStyle} placeholder="请填写排序" />)}
          </Form.Item>

          <Form.Item {...tailFormItemLayout}>
            <Row>
              <Col>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Drawer>
    );
  }
}

@connect(({ organization, loading }) => ({
  ...organization,
  loading: loading.models.organization,
}))
@Form.create()
export default class extends React.Component {
  state = {
    tabKey: 'basic',
    visible: false,
    expandedKeys: [],
    autoExpandParent: true,
    rightClickNodeTreeItem: {
      pageX: '',
      pageY: '',
      id: '',
      categoryName: '',
    },
  };

  componentDidMount() {
    this.refresh();

    const self = this;
    document.addEventListener('click', () => {
      self.setState({
        rightClickNodeTreeItem: null,
      });
    });
  }

  componentWillReceiveProps(nextProps) {
    const {
      match: { params },
    } = nextProps;
    if (this.props.match.params.channel !== params.channel) {
      this.loadData({ page: 0, category: params.channel });
    }
  }

  onTabChange = (tabKey) => {
    this.setState({ tabKey });
  };

  loadData = (payload) => {
    const {
      dispatch,
      match: { params },
    } = this.props;

    dispatch({
      type: `${MODEL_NAME}/fetch`,
      payload: {
        category: !!payload.category ? payload.category : params.channel,
      },
    });
  };

  refresh = () => {
    const { data } = this.props;
    this.loadData({ page: data.page });
  };

  toCreate = (parentId) => {
    this.props.dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        parentId,
      },
    });

    this.setState((state) => ({
      ...state,
      visible: true,
    }));
  };

  toRemove = () => {
    this.props.dispatch({
      type: `${MODEL_NAME}/remove`,
      payload: {
        callback: () => {
          this.refresh();
          message.success('删除成功');
        },
      },
    });
  };

  toDelete = (id) => {
    this.props.dispatch({
      type: `${MODEL_NAME}/delete`,
      payload: {
        id,
        callback: () => {
          this.refresh();
          message.success('删除成功');
        },
      },
    });
  };

  onClose = () => {
    this.props.dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        parentId: null,
      },
    });

    this.setState((state) => ({
      ...state,
      visible: false,
    }));
  };

  onCheck = (selectedRows) => {
    this.props.dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        selectedRows,
      },
    });
  };

  onDrop = (e) => {
    this.props.dispatch({
      type: `${MODEL_NAME}/parent`,
      payload: {
        id: e.dragNode.props.dataRef.id,
        parentId: e.node.props.dataRef.id,
      },
    });
  };

  onSelect = (selectedKeys) => {
    const {
      dispatch,
      form: { setFieldsValue },
    } = this.props;

    if (selectedKeys.length > 0) {
      const id = selectedKeys[0];

      dispatch({
        type: `${MODEL_NAME}/detail`,
        payload: {
          id,
          callback: (val) => setFieldsValue(val),
        },
      });
    }
  };

  onExpand = (expandedKeys) => {
    this.setState({
      expandedKeys,
      autoExpandParent: false,
    });
  };

  onRightClick = (e) => {
    this.setState({
      rightClickNodeTreeItem: {
        pageX: e.event.pageX,
        pageY: e.event.pageY,
        id: e.node.props.dataRef.id,
      },
    });
  };

  onRightMenuClick = (e, id) => {
    switch (e.key) {
      case 'add':
        this.toCreate(id);
        break;
      case 'delete':
        this.toDelete(id);
        break;
    }
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

  renderTreeNodesRightMenu = () => {
    const { pageX, pageY, id } = { ...this.state.rightClickNodeTreeItem };

    const tmpStyle = {
      position: 'absolute',
      minWidth: '120px',
      left: `${pageX - 220}px`,
      top: `${pageY - 102}px`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    };
    const menu = (
      <Menu style={tmpStyle} onClick={(e) => this.onRightMenuClick(e, id)}>
        <Menu.Item key="add">
          <Icon type="plus" />
          新增子节点
        </Menu.Item>
        <Menu.Item key="delete">
          <Icon type="delete" />
          删除
        </Menu.Item>
      </Menu>
    );

    return this.state.rightClickNodeTreeItem == null ? '' : menu;
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
        <Form.Item {...formItemLayout} label="编号">
          {getFieldDecorator('id', {
            initialValue: !selectedNode ? null : selectedNode['id'],
            rules: [
              {
                required: true,
                message: '编号不能为空',
              },
            ],
          })(<Input disabled {...formItemStyle} type="text" placeholder="请填写编号" />)}
        </Form.Item>

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

        <Form.Item {...formItemLayout} label="描述">
          {getFieldDecorator('desc', {
            initialValue: !selectedNode ? null : selectedNode['desc'],
          })(<Input {...formItemStyle} type="text" placeholder="请填写描述" />)}
        </Form.Item>

        <Form.Item {...formItemLayout} label="排序">
          {getFieldDecorator('sort', {
            initialValue: !selectedNode ? 0 : selectedNode['sort'],
          })(<InputNumber min={0} {...formItemStyle} placeholder="请填写排序" />)}
        </Form.Item>

        <Form.Item {...tailFormItemLayout}>
          <Row>
            <Col>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    );
  };

  render() {
    const { data, selectedNode, selectedRows } = this.props;

    return (
      <Layout>
        <Content className={styles.normal}>
          <CreateForm visible={this.state.visible} onClose={this.onClose} />
          <Row className="filter-row" gutter={6}>
            <Col className="gutter-row" span={8}>
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
                </Upload> */}
              </ButtonGroup>

              <Tree
                blockNode
                checkable
                draggable
                onDrop={this.onDrop}
                // onExpand={this.onExpand}
                // expandedKeys={this.state.expandedKeys}
                // autoExpandParent={this.state.autoExpandParent}
                onCheck={this.onCheck}
                onSelect={this.onSelect}
                onRightClick={this.onRightClick}
              >
                {this.renderTreeNodes(data)}
              </Tree>
              {this.renderTreeNodesRightMenu()}
            </Col>
            <Col className="gutter-row" span={14} offset={1}>
              {!!selectedNode ? (
                <Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
                  <Tabs.TabPane tab="基本信息" key="basic">
                    {this.renderBasicForm()}
                  </Tabs.TabPane>
                </Tabs>
              ) : (
                ''
              )}
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }
}
