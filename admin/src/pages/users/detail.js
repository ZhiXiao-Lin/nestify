import React, { Fragment } from 'react';
import { connect } from 'dva';
import router from 'umi/router';
import {
  Tabs,
  Form,
  Input,
  Row,
  Col,
  Icon,
  Button,
  Skeleton,
  Radio,
  TreeSelect,
  message,
} from 'antd';

import { apiUploadOne } from '@/utils';

import ImageCropper from '@/components/ImageCropper';
import RolesEditor from '@/components/RolesEditor';

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const MODEL_NAME = 'users';

@Form.create()
@connect(({ role, authority, organization, users }) => ({
  role,
  authority,
  organization,
  selectedNode: users.selectedNode,
  columns: users.columns,
}))
export default class extends React.Component {
  state = {
    tabKey: 'basic',
    expandedKeys: [],
    autoExpandParent: true,
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

  loadData = (id) => {
    const {
      dispatch,
      match: { params },
    } = this.props;

    if (!!params.id) {
      if ('CREATE' !== params.id) {
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
    }

    dispatch({
      type: 'role/fetch',
      payload: {
        pageSize: 1000,
      },
    });
    dispatch({
      type: 'authority/fetch',
      payload: {},
    });
    dispatch({
      type: 'organization/fetch',
      payload: {},
    });
  };

  onTabChange = (tabKey) => {
    this.setState({ tabKey });
  };

  onThumbnailUpload = async (file) => {
    const { dispatch } = this.props;

    const res = await apiUploadOne(file);

    if (!!res && !!res.path) {
      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: {
          avatar: res.path,
        },
      });
    }
  };

  resetHandler = () => {
    this.props.form.resetFields();
  };

  submitHandler = (e) => {
    e.preventDefault();

    const {
      dispatch,
      match: { params },
    } = this.props;

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
      organization,
      columns,
      form: { getFieldDecorator },
    } = this.props;

    const fields = columns.map((item) => item.dataIndex);

    return (
      <Form onSubmit={this.submitHandler} className="panel-form">
        <Form.Item {...formItemLayout} label="账号">
          {getFieldDecorator('account', {
            initialValue: !selectedNode ? null : selectedNode['account'],
          })(
            <Input
              disabled={!!selectedNode.id}
              {...formItemStyle}
              type="text"
              placeholder="请填写账号"
            />
          )}
        </Form.Item>

        <Form.Item {...formItemLayout} label="昵称">
          {getFieldDecorator('nickname', {
            initialValue: !selectedNode ? null : selectedNode['nickname'],
          })(<Input {...formItemStyle} type="text" placeholder="请填写昵称" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="性别">
          {getFieldDecorator('gender', {
            initialValue: !selectedNode ? null : selectedNode['gender'],
          })(
            <Radio.Group {...formItemStyle}>
              <Radio value={0}>男</Radio>
              <Radio value={1}>女</Radio>
            </Radio.Group>
          )}
        </Form.Item>
        <Form.Item {...formItemLayout} label="组织架构">
          {getFieldDecorator('org', {
            initialValue: !selectedNode ? null : selectedNode['org']['id'],
          })(
            <TreeSelect
              treeNodeFilterProp="title"
              showSearch
              treeDefaultExpandAll
              treeData={organization.data}
            />
          )}
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

  onSave = () => {
    const { dispatch } = this.props;

    dispatch({
      type: `${MODEL_NAME}/save`,
      payload: {},
    });
  };

  onRolesCheck = (roles) => {
    const { dispatch, selectedNode } = this.props;
    selectedNode.roles = roles;

    dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        selectedNode,
      },
    });
  };

  render() {
    const { selectedNode, columns, role, authority } = this.props;

    if (!selectedNode) return <Skeleton active loading />;

    const fields = columns.map((item) => item.dataIndex);

    return (
      <Fragment>
        <Button onClick={() => router.go(-1)}>
          <Icon type="arrow-left" />
          返回
        </Button>
        <Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
          <Tabs.TabPane tab="基本信息" key="basic">
            {this.renderBasicForm()}
          </Tabs.TabPane>
          {selectedNode.id ? (
            <Tabs.TabPane tab="头像" key="avatarPath">
              <ImageCropper
                url={!selectedNode.avatar ? '' : selectedNode.avatarPath}
                onUpload={this.onThumbnailUpload}
                width={200}
                height={200}
              />
            </Tabs.TabPane>
          ) : null}
          {selectedNode.id ? (
            <Tabs.TabPane disabled={selectedNode.isSuperAdmin} tab="权限管理" key="role">
              <Button type="primary" onClick={this.onSave} style={{ marginBottom: 20 }}>
                保存
              </Button>
              <RolesEditor
                user={selectedNode}
                roles={role.data.list}
                authoritysTree={authority.data}
                authoritys={authority.authoritys}
                onRolesCheck={this.onRolesCheck}
              />
            </Tabs.TabPane>
          ) : null}
        </Tabs>
      </Fragment>
    );
  }
}
