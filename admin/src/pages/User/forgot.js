import React, { PureComponent, Fragment } from 'react';
// import { Route } from 'react-router-dom';
import router from 'umi/router';
import { Card, Steps } from 'antd';
import Link from 'umi/link';
import * as fnCrypto from 'crypto';
import superFetch from '@/utils/apirequest';
import config from '../../utils/config';
import ForgotStep1Info from './forgot/Step1Info';
import ForgotStep2Confirm from './forgot/Step2Confirm';
import ForgotStep3Result from './forgot/Step3Result';
import styles from './forgot/style.less';

const { Step } = Steps;

const gUrlLogin = config.LOCAL_URL.LOGIN;
const gApiUrlForgot = config.API_URL.FORGOT;

const gResultProps = {
	success: {
		type: 'success',
		title: '重置成功',
		description: '密码已重置'
	},
	error: {
		type: 'error',
		title: '重置失败',
		description: '密码重置失败'
	}
};
const gStepTitle = [ '验证身份', '重置密码', '结果' ];
const gStepName = [ 'info', 'confirm', 'result' ];
const StepForm = ({ name, nextHandler, prevHandler, result, info }) => {
	if (name === 'info') return <ForgotStep1Info handleNext={nextHandler} />;
	if (name === 'confirm') return <ForgotStep2Confirm handleNext={nextHandler} handlePrev={prevHandler} info={info} />;
	if (name === 'result') return <ForgotStep3Result handleNext={nextHandler} {...gResultProps[result]} />;
};

export default class Forgot extends PureComponent {
	state = {
		step: 0,

		phonenumber: null,
		answer: null,
		password: '',
		result: 'error'
	};

	gotoNext = async (payload = {}) => {
		const nextstep = this.state.step + 1;

		if (nextstep >= gStepName.length) {
			router.push(gUrlLogin);
		} else {
			payload.step = nextstep;
			if (nextstep === 2) {
				const { phonenumber, answer, password } = this.state;

				const result = await superFetch.put(
					gApiUrlForgot,
					{
						origin: phonenumber,
						password: fnCrypto.createHash('md5').update(password).digest('hex')
					},
					{
						SmsAuthentication: JSON.stringify({
							phonenumber,
							answer
						})
					}
				);

				if (result && result.length > 0) {
					payload.result = 'success';
				}
			}

			this.setState(payload, async () => {});
		}
	};
	gotoPrev = () => {
		const { step } = this.state;
		if (step > 0) {
			this.setState({
				step: step - 1
			});
		}
	};

	render() {
		const { step } = this.state;
		return (
			<div className={styles.main}>
				<h3>忘记密码</h3>
				<Card bordered={false} className={styles.forgotForm}>
					<Fragment>
						<Steps current={step} className={styles.steps}>
							<Step title={gStepTitle[0]} />
							<Step title={gStepTitle[1]} />
							<Step title={gStepTitle[2]} />
						</Steps>
						<StepForm
							name={gStepName[step]}
							nextHandler={this.gotoNext}
							prevHandler={this.gotoPrev}
							result={this.state.result}
							info={this.state}
						/>
					</Fragment>
					<div className={styles.other}>
						<Link className={styles.register} to="/user/register">
							注册账户
						</Link>
						<Link className={styles.forgot} style={{ float: 'right' }} to="/user/login">
							立即登录
						</Link>
					</div>
				</Card>
			</div>
		);
	}
}
