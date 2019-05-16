import React from 'react';
import { Modal, Input } from 'antd';

// Dialog
export default class Dialog extends React.Component {
	render() {
		return (
			<div>
				<Modal {...this.props}>{this.props.inputs.map((props) => <Input {...props} />)}</Modal>
			</div>
		);
	}
}
