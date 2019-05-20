import React, { Component } from 'react';
import * as fnCrypto from 'crypto';
import Link from 'umi/link';
import { Form, Input, Button, Row, Col, Popover, Progress, message } from 'antd';
import superFetch from '@/utils/apirequest';
import { hasErrors } from '@/utils/utils';
import config from '../../utils/config';
import styles from './register.less';

const gApiUrlRegister = config.API_URL.REGISTER;
const gApiUrlSVG = config.API_URL.VERIFICATION.SVG;
const gApiUrlSMS = config.API_URL.VERIFICATION.SMS.USER_REGISTER;
const gUrlPageLogin = config.LOCAL_URL.LOGIN;

const FormItem = Form.Item;
const InputGroup = Input.Group;

const passwordStatusMap = {
	ok: <div className={styles.success}>强</div>,
	pass: <div className={styles.warning}>中</div>,
	poor: <div className={styles.error}>弱</div>
};
const passwordProgressMap = {
	ok: 'success',
	pass: 'normal',
	poor: 'exception'
};
function getPasswordQuality(password) {
	if (!!password && password.length > 9) {
		return 'ok';
	}
	if (!!password && password.length > 5) {
		return 'pass';
	}
	return 'poor';
}

@Form.create()
export default class Register extends Component {
	state = {
		svgCode: '',
		count: 0
	};

	componentDidMount() {
		this.handleRefreshSvg();
		this.setState((state) => ({ ...state, count: 0 }));
	}

	handleRefreshSvg = async () => {
		const svgCode = await superFetch.get(gApiUrlSVG);
		if (!!svgCode) {
			this.setState({ svgCode });
		}
	};

	handleSubmit = async (e) => {
		e.preventDefault();
		const { form: { validateFields, resetFields } } = this.props;
		validateFields({ force: true }, async (err, values) => {
			if (!err) {
				const result = await superFetch.post(
					gApiUrlRegister,
					[
						{
							phonenumber: values.phonenumber,
							real_name: values.real_name,
							credential: values.credential,
							password: fnCrypto.createHash('md5').update(values.password).digest('hex')
						}
					],
					{
						SvgAuthentication: JSON.stringify({
							key: fnCrypto.createHash('md5').update(this.state.svgCode).digest('hex'),
							answer: values.svgAnswer
						}),
						SmsAuthentication: JSON.stringify({
							phonenumber: values.phonenumber,
							answer: values.smsAnswer
						})
					}
				);
				// console.log(result);
				if (!!result && !!result.users && result.users.length === 1) {
					message.success('用户注册成功！');
					resetFields();
				} else {
					message.error('用户注册失败！');
					this.handleRefreshSvg();
				}
			}
		});
	};

	checkPassword = (rule, value, callback) => {
		if (!value || value.length < 6) {
			callback('请至少输入 6 个字符。请不要使用容易被猜到的密码。');
		} else {
			// form.validateFields([ 'confirm' ], { force: true });
			callback();
		}
	};

	checkConfirm = (rule, value, callback) => {
		if (value && value !== this.props.form.getFieldValue('password')) {
			callback('两次输入的密码不一致');
		} else {
			callback();
		}
	};

	onGetCaptcha = () => {
		this.props.form.validateFields([ 'phonenumber' ], { force: true }, async (err, values) => {
			if (!err) {
				const phonenumber = values.phonenumber;

				await superFetch.get(gApiUrlSMS + '/' + phonenumber);

				let count = 59;
				this.setState({ count });
				this.interval = setInterval(() => {
					count -= 1;
					this.setState({ count });
					if (count === 0) {
						clearInterval(this.interval);
					}
				}, 1000);
			}
		});
	};

	renderPasswordProgress = () => {
		const { form: { getFieldValue } } = this.props;
		const password = getFieldValue('password');
		const quality = getPasswordQuality(password);
		return password && password.length ? (
			<div className={styles[`progress-${quality}`]}>
				<Progress
					status={passwordProgressMap[quality]}
					className={styles.progress}
					strokeWidth={6}
					percent={password.length * 10 > 100 ? 100 : password.length * 10}
					showInfo={false}
				/>
			</div>
		) : null;
	};
	render() {
		const { form: { getFieldDecorator, getFieldsValue, getFieldsError } } = this.props;
		const { svgCode, count } = this.state;
		const values = getFieldsValue();
		return (
			<div className={styles.main}>
				<h3>注册账户</h3>
				<Form onSubmit={this.handleSubmit}>
					<FormItem>
						{getFieldDecorator('credential', {
							rules: [
								{
									required: true,
									message: '请输入用户名！'
								}
							]
						})(<Input size="large" placeholder={'请输入用户名'} />)}
					</FormItem>
					<FormItem>
						<Popover
							getPopupContainer={(node) => node.parentNode}
							content={
								<div style={{ padding: '4px 0' }}>
									{passwordStatusMap[getPasswordQuality(values['password'])]}
									{this.renderPasswordProgress()}
									<div style={{ marginTop: 10 }}>密码强度</div>
								</div>
							}
							overlayStyle={{ width: 240 }}
							placement="right"
							visible={!!values['password']}
						>
							{getFieldDecorator('password', {
								rules: [
									{
										validator: this.checkPassword
									}
								]
							})(<Input size="large" type="password" placeholder={'请输入密码'} />)}
						</Popover>
					</FormItem>
					<FormItem>
						{getFieldDecorator('confirm', {
							rules: [
								{
									required: true,
									message: '请确认密码！'
								},
								{
									validator: this.checkConfirm
								}
							]
						})(<Input size="large" type="password" placeholder={'请确认密码'} />)}
					</FormItem>
					<FormItem>
						{getFieldDecorator('real_name', {
							rules: [
								{
									required: true,
									message: '请输入真实姓名！'
								}
							]
						})(<Input size="large" placeholder={'请输入真实姓名'} />)}
					</FormItem>
					<FormItem>
						<Row gutter={8}>
							<Col span={16}>
								{getFieldDecorator('svgAnswer', {
									rules: [
										{
											required: true,
											message: '请输入验证码！'
										}
									]
								})(<Input size="large" placeholder={'验证码'} />)}
							</Col>
							<Col
								span={8}
								dangerouslySetInnerHTML={{ __html: svgCode }}
								onClick={this.handleRefreshSvg}
							/>
						</Row>
					</FormItem>
					<FormItem>
						<InputGroup compact>
							{getFieldDecorator('phonenumber', {
								rules: [
									{
										required: true,
										message: '请输入手机号！'
									},
									{
										pattern: /^\d{11}$/,
										message: '手机号格式不正确！'
									}
								]
							})(<Input size="large" placeholder={'请输入手机号'} />)}
						</InputGroup>
					</FormItem>
					<FormItem>
						<Row gutter={8}>
							<Col span={16}>
								{getFieldDecorator('smsAnswer', {
									rules: [
										{
											required: true,
											message: '请输入短信验证码！'
										}
									]
								})(<Input size="large" placeholder={'请输入短信验证码'} />)}
							</Col>
							<Col span={8}>
								<Button
									size="large"
									disabled={count}
									className={styles.getCaptcha}
									onClick={this.onGetCaptcha}
								>
									{count ? `${count} s` : '发送验证码'}
								</Button>
							</Col>
						</Row>
					</FormItem>
					<FormItem>
						<Button
							disabled={hasErrors(getFieldsError())}
							className={styles.submit}
							size="large"
							type="primary"
							htmlType="submit"
						>
							注册
						</Button>
						<Link className={styles.login} to={gUrlPageLogin}>
							使用现有账户登录
						</Link>
					</FormItem>
				</Form>
			</div>
		);
	}
}
