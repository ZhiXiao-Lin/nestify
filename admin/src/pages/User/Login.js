import React from 'react';
import { connect } from 'dva';
import Link from 'umi/link';
import Login from '@/components/Login';
import styles from './login.less';

const fnCrypto = require('crypto');
const { Tab, UserName, Password, Submit } = Login;

@connect(({ user, loading }) => ({
	user,
	submitting: loading.models.user
}))
class LoginPage extends React.Component {
	handleSubmit = async (err, values) => {
		if (!!err) return;

		const { dispatch } = this.props;
		dispatch({
			type: 'user/login',
			payload: values
			// payload: {
			// 	credential: values.credential,
			// 	password: fnCrypto.createHash('md5').update(values.password).digest('hex')
			// }
		});
	};

	render() {
		const { submitting } = this.props;
		return (
			<div className={styles.main}>
				<Login
					defaultActiveKey="account"
					onTabChange={this.onTabChange}
					onSubmit={this.handleSubmit}
					ref={(form) => {
						this.loginForm = form;
					}}
				>
					<Tab key="account" tab="账户登录">
						<UserName name="account" placeholder="账号" />
						<Password
							name="password"
							placeholder="密码"
							onPressEnter={() => this.loginForm.validateFields(this.handleSubmit)}
						/>
					</Tab>
					<Submit loading={submitting}>登录</Submit>

					<div className={styles.other}>
						{/* 其他登录方式
						<Icon type="wechat" className={styles.icon} theme="outlined" />
						<Icon type="alipay" className={styles.icon} theme="outlined" />
						<Icon type="weibo" className={styles.icon} theme="outlined" /> */}
						{/* <Link className={styles.register} to="/user/register">
							注册账户
						</Link> */}
						{/* <Link className={styles.forgot} to="/user/forgot">
							忘记密码
						</Link> */}
					</div>
				</Login>
			</div>
		);
	}
}

export default LoginPage;
