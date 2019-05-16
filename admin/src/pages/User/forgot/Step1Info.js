import React, { Fragment } from 'react';
import { Form, Input, Button, Select, Divider, Row, Col, message } from 'antd';
import config from '../../../utils/config';
import { hasErrors } from '@/utils/utils';
import superFetch from '@/utils/apirequest';
import styles from './style.less';

const FormItem = Form.Item;
const { Option } = Select;
const InputGroup = Input.Group;

const formItemLayout = { labelCol: { span: 5 }, wrapperCol: { span: 19 } };

const gApiUrlSMS = config.API_URL.VERIFICATION.SMS.PASSWORD_RESET;
const COUNT_DOWN_NUMBER = 59;

@Form.create()
export default class ForgotStep1Info extends React.PureComponent {
	state = {
		count: 0,
		prefix: '86'
	};

	componentWillUnmount() {
		clearInterval(this.interval);
	}
	toApplyVerificationCode = () => {
		this.props.form.validateFields([ 'phonenumber' ], async (err, values) => {
			if (!!err) return;
			if (!!this.interval) return;

			const result = { status: 200 }; // await superFetch.get(`${gApiUrlSMS}/${values['phonenumber']}`);
			// console.log('sms: ', result);
			if (!result || result.status !== 200) {
				message.error('验证短信发送失败！');
				return;
			}

			let count = COUNT_DOWN_NUMBER;
			this.setState({ count });

			this.interval = setInterval(() => {
				count--;
				this.setState({ count }, () => {
					if (count === 0) {
						clearInterval(this.interval);
						this.interval = null;
					}
				});
			}, 1000);
		});
	};

	onValidateForm = () => {
		const { handleNext } = this.props;
		this.props.form.validateFields((err, values) => {
			if (!err) {
				// router.push('/user/forgot/confirm');
				if (!!handleNext) handleNext(values);
			}
		});
	};

	render() {
		const { form: { getFieldDecorator, isFieldTouched, getFieldError, getFieldsError } } = this.props;
		const { count } = this.state;

		return (
			<Fragment>
				<Form layout="horizontal" className={styles.stepForm} hideRequiredMark>
					<FormItem {...formItemLayout} label="手机号" required={false}>
						<InputGroup compact>
							{getFieldDecorator('phonenumber', {
								rules: [
									{
										required: true,
										message: '请输入手机号！'
									},
									{
										pattern: /^1[34578]\d{9}$/, //  /^\d{11}$/,
										message: '请输入正确的手机号！'
									}
								]
							})(<Input placeholder={'请输入已绑定的手机号'} />)}
						</InputGroup>
					</FormItem>
					<FormItem {...formItemLayout} label="验证码" required={false}>
						<Row gutter={8}>
							<Col span={16}>
								{getFieldDecorator('answer', {
									rules: [
										{
											required: true,
											message: '请输入验证码！'
										}
									]
								})(<Input placeholder={'验证码'} />)}
							</Col>
							<Col span={8}>
								<Button
									disabled={
										!isFieldTouched('phonenumber') || !!getFieldError('phonenumber') || count > 0
									}
									className={styles.getCaptcha}
									onClick={this.toApplyVerificationCode}
								>
									{count ? `${count} s` : '获取验证码'}
								</Button>
							</Col>
						</Row>
					</FormItem>
					<Form.Item
						wrapperCol={{
							xs: { span: 24, offset: 0 },
							sm: {
								span: formItemLayout.wrapperCol.span,
								offset: formItemLayout.labelCol.span
							}
						}}
						label=""
					>
						<Button
							type="primary"
							disabled={!isFieldTouched('answer') || hasErrors(getFieldsError())}
							onClick={this.onValidateForm}
						>
							下一步
						</Button>
					</Form.Item>
				</Form>
				<Divider style={{ margin: '40px 0 24px' }} />
				<div className={styles.desc}>
					<h3>说明</h3>
					<h4>验证身份后重置密码</h4>
				</div>
			</Fragment>
		);
	}
}
