import React from 'react';
import { Form, Input, Button, message } from 'antd';
import { connect } from 'dva';
import config from '../../../utils/config';
import { hasErrors } from '../../../utils/utils';

import styles from './PasswordView.less';

const fnCrypto = require('crypto');
const FormItem = Form.Item;

@connect(({ user, loading }) => ({
	credential: user.credential || {},
	loading: loading.models.user,
}))
@Form.create()
export default class PasswordView extends React.Component {

	validatePassword = (rule, value, callback) => {
		if (!value || (value.length < 6)) {
			callback('请至少输入 6 个字符。请不要使用容易被猜到的密码。');
		} else {
			// form.validateFields([ 'confirm' ], { force: true });
			callback();
		}
	};
	validateRepeat = (rule, value, callback) => {
		if (value && value !== this.props.form.getFieldValue('password')) {
			callback('两次输入的密码不一致');
		} else {
			callback();
		}
	};

	handleSubmit = async (e) => {
		e.preventDefault();

		const { dispatch, form: { validateFields, setFields, resetFields } } = this.props;

		validateFields([
			'origin', 'password', 'repeat'
		], (err, values) => {
			if (!err) {
				dispatch({
					type: 'user/changePassword',
					payload: { 
						origin: fnCrypto.createHash('md5').update(values.origin).digest('hex'),
						password: fnCrypto.createHash('md5').update(values.password).digest('hex')
					}
				});
	
				resetFields();
			}
		})
	};

	render() {
		const { form: { getFieldDecorator, getFieldsError } } = this.props;
		return (
			<div className={styles.passwordView} ref={this.getViewDom}>
				<div className={styles.left}>
					<Form layout="vertical" onSubmit={this.handleSubmit} >
						<FormItem label={'原有密码'}>
							{getFieldDecorator('origin', { rules: [{
								required: true,
								message: '请输入原有账号密码'
							}]})(<Input type='password' />)}
						</FormItem>
						<FormItem label={'新密码'}>
							{getFieldDecorator('password', { rules: [
								{
									required: true,
									message: '请输入新密码'
								},
								{
									validator: this.validatePassword
								}
							]})(<Input type='password' />)}
						</FormItem>
						<FormItem label={'重复新密码'}>
							{getFieldDecorator('repeat', { rules: [
								{
									required: true,
									message: '请再次输入新密码'
								},
								{
									validator: this.validateRepeat
								}
							]})(<Input type='password' />)}
						</FormItem>
						<Button 
							type="primary" 
							htmlType="submit"
            				disabled={hasErrors(getFieldsError())}
						>重设密码</Button>
					</Form>
				</div>
			</div>
		);
	}
}
