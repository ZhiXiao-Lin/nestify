import React, { Fragment } from 'react';
import { Button } from 'antd';
import router from 'umi/router';
import Result from '@/components/Result';
import styles from './style.less';

export default class ForgotStep3Result extends React.PureComponent {
	onFinish = () => {
		const { handleNext } = this.props;
		if(!!handleNext) handleNext();
	}
	actions = (
		<Fragment>
			<Button type="primary" onClick={this.onFinish}>
				立即登录
			</Button>
		</Fragment>
	);
	render() {
		return (
			<Result	
				className={styles.result} 
				actions={this.actions} 
				extra='' 
				{...this.props}
				// type="success"
				// title="重置成功"
				// description="密码已重置"
			/>
		);
	}
}
