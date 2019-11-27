import React, { Component } from 'react';
import { Input, Button, Form, Card, message, Row, Col } from 'antd';
import ajax from 'util/api/ajax';
import { putPassword } from 'util/api';
import loginUtil from 'util/login';

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 5 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 10 }
  }
};

class RePassword extends Component {
  constructor(props) {
    super(props);
    this.state = {
      CaptchaButtonValue: '获取验证码',
      disabled: false,
      configPhoneNumber: false
    };
    this.initial();
  }

  initial = () => {
    console.log('initial with here!');
  };

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll(async (err, values) => {
      if (!err) {
        console.log('Received values of form: ', values);
        if (!this.state.configPhoneNumber) {
          const res = await putPassword(
            {
              phone: values.currentPhoneNumber,
              oldPassWord: values.oldPassword,
              newPassWord: values.newPassWord
            }
          );
          console.log(res);
          if (res.code === 0) {
            message.success('密码修改成功！');
          } else {
            message.success('修改失败 请您稍后再次尝试！');
          }
          // ajax({
          //   method: 'PUT',
          //   url: '/api/v1/user/password',
          //   data: {
          //     phone: values.currentPhoneNumber,
          //     oldPassWord: values.oldPassword,
          //     newPassWord: values.newPassWord
          //   }
          // })
          //   .then((res) => {
          //     console.log(res);
          //     if (res.code === 0) {
          //       message.success('密码修改成功！');
          //     } else {
          //       message.success('修改失败 请您稍后再次尝试！');
          //     }
          //   })
          //   .catch((error) => {
          //     console.log(error);
          //     message.error('出了些问题，密码未能修改成功，如有需要请联系客服！');
          //   });
        } else {
          ajax({
            url: '/api/v1/user/phone',
            method: 'PUT',
            data: {
              phone: values.newPhoneNumber,
              password: values.password,
              captcha: values.captcha
            }
          })
            .then((res) => {
              console.log(res);
              if (res.code === 0) {
                message.success('手机号修改成功！');
              } else {
                message.success('修改失败 请您稍后再次尝试！');
              }
            })
            .catch((error) => {
              console.log(error);
              message.error('出了些问题，手机号未能修改成功，如有需要请联系客服！');
            });
        }
      }
    });
  };

  validateToNextPassword = (rule, value, callback) => {
    const { form } = this.props.form;
    if (value && this.state.confirmDirty) {
      form.validateFields(['compareNewPassWord'], { force: true });
    }
    callback();
  };

  compareToFirstPassword = (rule, value, callback) => {
    const { form } = this.props.form;
    if (value && value !== form.getFieldValue('newPassWord')) {
      callback('两次密码不一致！');
    } else {
      callback();
    }
  };

  render() {
    const userInfo = loginUtil.getUserInfo() || {};
    const { getFieldDecorator } = this.props.form;
    // const { form: { validateFields } } = this.props;

    return (
      <div>
        <Card bordered={false}>
          <Form onSubmit={this.handleSubmit}>
            <Form.Item {...formItemLayout} label="当前手机号">
              {getFieldDecorator('currentPhoneNumber', {
                initialValue: userInfo.name
              })(<Input disabled />)}
              <Button
                style={{ marginTop: 20 }}
                onClick={() => {
                  // console.log(this.props.form.setFieldsValue
                  this.setState({
                    configPhoneNumber: !this.state.configPhoneNumber
                  });
                }}
              >
                {!this.state.configPhoneNumber ? '修改手机号' : '取消'}
              </Button>
            </Form.Item>
            {!this.state.configPhoneNumber
              ? [
                <Form.Item {...formItemLayout} label="原密码" key="oldPassWord">
                  {getFieldDecorator('oldPassWord', {
                    rules: [
                      {
                        required: true,
                        message: '请输入您的原密码！'
                      }
                    ]
                  })(<Input type="password" placeholder="输入原密码" />)}
                </Form.Item>,
                <Form.Item {...formItemLayout} label="新密码" key="newPassWord">
                  {getFieldDecorator('newPassWord', {
                    rules: [
                      {
                        required: true,
                        pattern: /^(?![0-9]+$)(?![a-zA-Z]+$)[0-9A-Za-z]{7,18}$/,
                        message: '请输入数字+字母，8-18位的新密码！'
                      }
                    ]
                  })(<Input type="password" placeholder="输入新密码，数字+字母，8-18位" />)}
                </Form.Item>,
                <Form.Item {...formItemLayout} label="确认密码" key="compareNewPassWord">
                  {getFieldDecorator('compareNewPassWord', {
                    rules: [
                      {
                        required: true,
                        message: '请确认您的新密码'
                      },
                      {
                        validator: this.compareToFirstPassword
                      }
                    ]
                  })(<Input type="password" placeholder="确认新密码" />)}
                </Form.Item>
              ]
              : [
                <Form.Item {...formItemLayout} label="登录密码" key="password">
                  {getFieldDecorator('password', {
                    rules: [
                      {
                        required: true,
                        message: '请输入登录密码'
                      }
                    ]
                  })(<Input type="password" placeholder="输入登录密码" />)}
                </Form.Item>,
                <Form.Item {...formItemLayout} label="新手机号" key="newPhoneNumber">
                  {getFieldDecorator('newPhoneNumber', {
                    rules: [
                      {
                        required: true,
                        pattern: /^(13[0-9]|14[579]|15[0-3,5-9]|16[6]|17[0135678]|18[0-9]|19[89])\d{8}$/,
                        message: '请核对您的新手机号！'
                      }
                    ]
                  })(<Input placeholder="输入手机号" />)}
                </Form.Item>,
                <Form.Item {...formItemLayout} label="验证码" key="captcha">
                  {getFieldDecorator('captcha', {
                    rules: [
                      {
                        required: true,
                        message: '请输入验证码！'
                      }
                    ]
                  })(
                    <Row>
                      <Col span={14}>
                        <Input />
                      </Col>
                      <Col push={2} span={8}>
                        <Button
                          disabled={this.state.disabled}
                          onClick={() => {
                            const newPhoneNumber = this.props.form.getFieldValue(
                              'newPhoneNumber'
                            );
                            if (newPhoneNumber !== undefined) {
                              if (this.state.CaptchaButtonValue === '获取验证码') {
                                this.setState({
                                  CaptchaButtonValue: 59,
                                  disabled: true
                                });
                                const captchaInterval = setInterval(() => {
                                  if (this.state.CaptchaButtonValue > 1) {
                                    this.setState({
                                      CaptchaButtonValue: this.state.CaptchaButtonValue - 1
                                    });
                                  } else {
                                    this.setState({
                                      CaptchaButtonValue: '获取验证码',
                                      disabled: false
                                    });
                                    clearInterval(captchaInterval);
                                  }
                                }, 1000);
                              }
                              ajax({
                                method: 'PUT',
                                url: '/api/v1/captcha',
                                data: {
                                  phone: newPhoneNumber,
                                  type: 3
                                }
                              })
                                .then((res) => {
                                  console.log(res);
                                  res.code === 0
                                    ? message.success('验证码已发送，请注意查收！')
                                    : message.error(
                                      '出了些问题，验证码未能发送成功，如有需要请联系客服！'
                                    );
                                })
                                .catch((error) => {
                                  console.log(error);
                                  message.error(
                                    '出了些问题，验证码未能发送成功，如有需要请联系客服！'
                                  );
                                });
                            } else {
                              message.info('请确认您的手机号！');
                            }
                          }}
                        >
                          {this.state.CaptchaButtonValue === '获取验证码'
                            ? this.state.CaptchaButtonValue
                            : `${this.state.CaptchaButtonValue}s`}
                        </Button>
                      </Col>
                    </Row>
                  )}
                </Form.Item>
              ]}

            <Form.Item
              {...formItemLayout}
              wrapperCol={{
                xs: { span: 24, offset: 0 },
                sm: { span: 16, offset: 5 }
              }}
            >
              <Button type="primary" style={{ width: 280 }} htmlType="submit">
                提交修改
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }
}

export default Form.create()(RePassword);
