import React, { Component, Fragment } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { Form, Input, Upload, Button, message } from 'antd';
import { connect } from 'dva';
import ImageCropper from '../../../components/ImageCropper';
import config from '../../../utils/config';
import { getAvatarURL, hasErrors, 
// validatePhonenumber 
} from '../../../utils/utils';
import { upload2Backend, apiDelete } from '../../../utils/apirequest';

import styles from './BaseView.less';

const FormItem = Form.Item;

const gApiUploadBackend = config.API_URL.UPLOAD.BACKEND_STORAGE;

@connect(({ user, loading }) => ({
	credential: user.credential || {},
	loading: loading.models.user,
}))
@Form.create()
export default class BaseView extends Component {

	componentWillReceiveProps(nextProps) {
		this.setBaseInfo(nextProps);
	}
	
	/**
	 * 何时需要更新 Form Field ???
	 * 
	 * 触发条件：componentWillReceiveProps
	 * 
	 * 1. 页面刷新（ credential 会有变化 ）
	 * 2. 用户输入（ obj 和 values 会不相等）
	 * 3. 
	 */
	setBaseInfo = (props) => {
		// console.log('setBaseInfo');

		const { credential, form } = props;
		if (!credential || !credential.user) return;

		const obj = {};
		Object.keys(form.getFieldsValue()).forEach((key) => {
			obj[key] = credential.user[key] || null;
		});

		const values = form.getFieldsValue();

		// console.log(obj, values, credential, this.props.credential);

		if (!_.isEqual(credential, this.props.credential)) {
			form.setFieldsValue(obj);
			return;
		}
		if (_.isEqual(obj, values)) {
			// console.log('obj return');
			return;
		}
		else if (!values['real_name'] && !values['phonenumber']) {
			form.setFieldsValue(obj);
		}
	};

	getViewDom = (ref) => {
		this.view = ref;
	};

	handleUpload = async (file) => {

		const { credential } = this.props;
		const origin = !credential.user ? null : credential.user.avatar;

		const result = await upload2Backend(
			file, 'avatar', 'avatar',
			`${this.props.credential.user.id}_${moment().unix()}`,
			{ action: 'RENAME' }
		);
		console.log('handleUpload result: ', result);
	
		if ((result instanceof Error) || (result.action !== 'RENAME') || (!result.result) ) {
			message.error("文件导入失败！");
			return false;
		}

		this.props.dispatch({
			type: 'user/updateCurrentUser',
			payload: { newvalue: {avatar: result.result} }
		});

		if (!!origin) {
			const del = await apiDelete(gApiUploadBackend, {
				filename: origin
			});
			console.log('delete result: ', del);
		}

		return false
	}
	
	handleSubmit = async (e) => {
		e.preventDefault();

		const { dispatch, form: { getFieldsValue, validateFields, setFields } } = this.props;

		validateFields([
			'phonenumber', 'real_name', 'nick_name', 'title'
		], (err, values) => {
			if (!err) {
				dispatch({
					type: 'user/updateCurrentUser',
					payload: { newvalue: values }
				});
			}
		})
	};

	// validatePhonenumber = (rule, value, callback) => {
	// 	if (validatePhonenumber(value)) { callback(); } 
	// 	else { callback('请输入正确的手机号码！'); }
	// };

	render() {
		const { credential, form: { getFieldDecorator, getFieldsError } } = this.props;
		const link = !credential.user ? null : credential.user.avatar;
		return (
			<div className={styles.baseView} ref={this.getViewDom}>
				<div className={styles.left}>
					<Form layout="vertical" onSubmit={this.handleSubmit} >
						<FormItem label={'手机号码'}>
							{getFieldDecorator('phonenumber', {	rules: [
								{
									pattern: /^1[34578]\d{9}$/,
									required: true,
									message: '请输入正确的手机号码'
								},
								// {
								// 	validator: this.validatePhonenumber
								// }
							]})(<Input />)}
						</FormItem>
						<FormItem label={'真实姓名'}>
							{getFieldDecorator('real_name', { rules: [{
								required: true,
								message: '请输入真实姓名'
							}]})(<Input />)}
						</FormItem>
						<FormItem label={'昵称'}>
							{getFieldDecorator('nick_name', { rules: [{
								required: false,
								message: '请输入昵称'
							}]})(<Input />)}
						</FormItem>
						<FormItem label={'头衔'}>
							{getFieldDecorator('title', { rules: [{
								required: false,
								message: '请输入头衔'
							}]})(<Input />)}
						</FormItem>
						<Button 
							type="primary" 
							htmlType="submit"
            				disabled={hasErrors(getFieldsError())}
						>更新基本信息</Button>
					</Form>
				</div>
				<div className={styles.right}>
					<ImageCropper 
						imageUrl={getAvatarURL(link)} 
						onUpload={this.handleUpload}
					/>
				</div>
			</div>
		);
	}
}
