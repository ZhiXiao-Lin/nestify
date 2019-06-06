import React from 'react';
import { Form, Input, Button, Popover, Progress } from 'antd';
import { hasErrors } from '@/utils/utils';
import styles from './style.less';

const formItemLayout = { labelCol: { span: 5 }, wrapperCol: { span: 19 } };

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
export default class ForgotStep2Confirm extends React.PureComponent {
	onValidateForm = (e) => {
		e.preventDefault();

		const { handleNext } = this.props;
		this.props.form.validateFields((err, values) => {
			if (!err) {
				if (!!handleNext) handleNext(values);
			}
		});
	};

	onPrev = () => {
		// router.push('/user/forgot/info');
		const { handlePrev } = this.props;
		if (!!handlePrev) handlePrev();
	};

	validateRepeat = (rule, value, callback) => {
		if (value && value !== this.props.form.getFieldValue('password')) {
			callback('两次输入的密码不一致');
		} else {
			callback();
		}
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
		const { form: { getFieldDecorator, getFieldsValue, isFieldTouched, getFieldsError }, info } = this.props;
		const values = getFieldsValue();
		return (
			<Form layout="horizontal" className={styles.stepForm}>
				<Form.Item {...formItemLayout} label="密码" required={false}>
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
							initialValue: '',
							rules: [
								{
									required: true,
									message: '请输入密码！'
								}
							]
						})(<Input type="password" autoComplete="off" style={{ width: '80%' }} />)}
					</Popover>
				</Form.Item>
				<Form.Item {...formItemLayout} label="确认密码" required={false}>
					{getFieldDecorator('repeat', {
						initialValue: '',
						rules: [
							{
								required: true,
								message: '请确认密码！'
							},
							{
								validator: this.validateRepeat
							}
						]
					})(<Input type="password" autoComplete="off" style={{ width: '80%' }} />)}
				</Form.Item>
				<Form.Item
					style={{ marginBottom: 8 }}
					wrapperCol={{
						xs: { span: 24, offset: 0 },
						sm: {
							span: formItemLayout.wrapperCol.span,
							offset: formItemLayout.labelCol.span
						}
					}}
					label=""
				>
					<Button onClick={this.onPrev}>上一步</Button>
					<Button
						disabled={
							!isFieldTouched('password') || !isFieldTouched('repeat') || hasErrors(getFieldsError())
						}
						type="primary"
						onClick={this.onValidateForm}
						style={{ marginLeft: 8 }}
					>
						重置
					</Button>
				</Form.Item>
			</Form>
		);
	}
}
