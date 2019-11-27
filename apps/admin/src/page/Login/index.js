import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { Link, withRouter } from 'react-router-dom';
import cssModules from 'react-css-modules';
import { message, Checkbox } from 'antd';
import Login from 'ant-design-pro/lib/Login';
import { login, getCaptcha } from 'util/api';
import loginUtil from 'util/login';
import AppFooter from 'component/AppFooter';

import styles from './style.less';

const { Mobile, Captcha, Submit } = Login;

@withRouter
@inject('loginStore')
@observer
@cssModules(styles)
class LoginPage extends Component {
  constructor(props) {
    super(props);

    this.store = this.props.loginStore;
    this.phoneRef = React.createRef();
  }

  state = {
    autoLogin: true
  };

  changeAutoLogin = (e) => {
    this.setState({
      autoLogin: e.target.checked
    });
  };

  handleSubmit = async (err, values) => {
    if (!err) {
      const res = await login(values.phone, values.captcha);
      if (res.code === 0) {
        console.log('res ', res);
        const { autoLogin } = this.state;
        if (autoLogin) {
          loginUtil.saveUserInfo(res.data);
        }
        message.success('登录成功');
        window.location.href = '/';
      } else if (res.code === 10200002) {
        message.error('验证码错误！');
      }
    }
  };

  getCaptcha = () =>
    new Promise((resolve, reject) => {
      this.phoneRef.current.validateFields(['phone'], {}, async (err, values) => {
        if (!err) {
          const res = await getCaptcha(values.phone);
          if (res.code === 0) {
            message.success('验证码已发送，请您留意查看！');
            resolve();
          } else {
            reject(err);
          }
        } else {
          reject(err);
        }
      });
    });

  render() {
    return (
      // @TODO <DocumentTitle title={this.getPageTitle()}>
      <div styleName="container">
        <div styleName="content">
          <div styleName="top">
            <div styleName="header">
              <Link to="/">
                {/* <img alt="logo" className={styles.logo} src={logo} /> */}
                <img
                  className={styles.logo}
                  src="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg"
                  alt="logo"
                />
                <span styleName="title">Ant Design</span>
              </Link>
            </div>
            <div styleName="desc">Ant Design 是西湖区最具影响力的 Web 设计规范</div>
          </div>
          <div styleName="login">
            <Login ref={this.phoneRef} onSubmit={this.handleSubmit}>
              <Mobile name="phone" placeholder="手机号" ref={this.phoneNumber} />
              <Captcha
                name="captcha"
                placeholder="验证码"
                buttonText="获取验证码"
                onGetCaptcha={this.getCaptcha}
              />
              <Submit
                type="primary"
                style={{ marginTop: '0 !import' }}
                htmlType="submit"
              >
                登录
              </Submit>
              <div>
                <Checkbox checked={this.state.autoLogin} onChange={this.changeAutoLogin}>
                  保持登录
                </Checkbox>
              </div>
            </Login>
          </div>
        </div>
        <AppFooter />
      </div>
    );
  }
}

export default LoginPage;
