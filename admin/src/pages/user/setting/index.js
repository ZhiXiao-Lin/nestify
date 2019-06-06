import React, { Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import { Tabs, Form, Input, Row, Col, Button, Radio, Skeleton } from 'antd';

import { apiUploadOne } from '@/utils';

import ImageCropper from '@/components/ImageCropper';

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const MODEL_NAME = 'user';

@Form.create()
@connect(({ user }) => ({
  currentUser: user.currentUser,
}))
export default class extends React.Component {
  state = {
    tabKey: 'basic',
  };

  componentDidMount() {
    this.loadData();
  }

  loadData = () => {
    const { dispatch } = this.props;

    dispatch({
      type: `${MODEL_NAME}/fetchCurrentUser`,
      payload: {},
    });
  };

  onTabChange = (tabKey) => {
    this.setState({ tabKey });
  };


  onAvatarUpload = async (file) => {
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

      values['publish_at'] = moment(values['publish_at']).format('YYYY-MM-DD HH:mm:ss');
      values['category'] = params.channel;

      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: values,
      });
    });
  };

  changePassword = (e) => {
    e.preventDefault();
    const {
      dispatch,

    } = this.props;

    this.props.form.validateFields((err, values) => {
      if (!!err || Object.keys(values).length === 0) {
        return;
      }

      dispatch({
        type: `${MODEL_NAME}/changePassword`,
        payload: values,
      });
    });
  }

  checkConfirm = (rule, value, callback) => {
    if (value && value !== this.props.form.getFieldValue('password')) {
      callback('两次输入的密码不一致');
    } else {
      callback();
    }
  };

  renderBasicForm = () => {
    const {
      currentUser,
      form: { getFieldDecorator },
    } = this.props;
    return (
      <Form onSubmit={this.submitHandler} className="panel-form">
        <Form.Item {...formItemLayout} label="昵称">
          {getFieldDecorator('nickname', {
            initialValue: !currentUser ? null : currentUser['nickname'],
          })(<Input {...formItemStyle} type="text" placeholder="请填写昵称" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="性别">
          {getFieldDecorator('gender', {
            initialValue: !currentUser ? null : currentUser['gender'],
          })(<Radio.Group {...formItemStyle}>
            <Radio value={0}>男</Radio>
            <Radio value={1}>女</Radio>
          </Radio.Group>)}
        </Form.Item>

        <Form.Item {...tailFormItemLayout}>
          <Row>
            <Col span={3}>
              <Button onClick={this.resetHandler}>重置</Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit">
                {!currentUser['id'] ? '新增' : '保存'}
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    );
  };

  renderPasswordForm = () => {
    const {
      form: { getFieldDecorator },
    } = this.props;
    return (
      <Form onSubmit={this.changePassword} className="panel-form">
        <Form.Item {...formItemLayout} label="旧密码">
          {getFieldDecorator('oldPassword', {
            rules: [
              {
                required: true,
                message: '旧密码不能为空',
              },
              {
                min: 8,
                message: '最少8位'
              },
              {
                max: 12,
                message: '最多12位'
              }
            ],
          })(<Input  {...formItemStyle} type="password" placeholder="请填写旧密码" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="新密码">
          {getFieldDecorator('password', {
            rules: [
              {
                required: true,
                message: '新密码不能为空',
              },
              {
                min: 8,
                message: '最少8位'
              },
              {
                max: 12,
                message: '最多12位'
              }
            ],
          })(<Input  {...formItemStyle} type="password" placeholder="请填写新密码" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="确认密码">
          {getFieldDecorator('confirmPassword', {
            rules: [
              {
                required: true,
                message: '确认密码不能为空',
              },
              {
                min: 8,
                message: '最少8位'
              },
              {
                max: 12,
                message: '最多12位'
              },
              {
                validator: this.checkConfirm
              }
            ],
          })(<Input  {...formItemStyle} type="password" placeholder="请填写确认密码" />)}
        </Form.Item>

        <Form.Item {...tailFormItemLayout}>
          <Row>
            <Col span={3}>
              <Button onClick={this.resetHandler}>重置</Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    );
  };

  render() {
    const { currentUser } = this.props;

    if (!currentUser) return <Skeleton active loading />;

    return (
      <Fragment>
        <Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
          <Tabs.TabPane tab="个人资料" key="basic">
            {this.renderBasicForm()}
          </Tabs.TabPane>

          <Tabs.TabPane tab="头像" key="avatar">
            <ImageCropper
              url={!currentUser.avatar ? '' : currentUser.avatarPath}
              onUpload={this.onAvatarUpload}
              width={200}
              height={200}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="修改密码" key="password">
            {this.renderPasswordForm()}
          </Tabs.TabPane>
        </Tabs>
      </Fragment>
    );
  }
}
