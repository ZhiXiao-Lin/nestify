import _ from 'lodash';
import React, { Fragment } from 'react';
import { Button, Upload, Icon } from 'antd';

export default class FileStore extends React.PureComponent {
	state = {
		fileList: []
	};

	static transformFileObj(f) {
		return {
			uid: f.uid || null,
			name: f.name || null,
			preUrl: f.preUrl || null,
			key: f.key || null,
			type: f.type || null,
			url: f.url || null
		};
	}

	initialState = (props) => {
		this.setState({ fileList: props.initialValue || [] });
	};

	componentWillReceiveProps(nextProps) {
		this.initialState(nextProps);
	}

	componentDidMount() {
		this.initialState(this.props);
	}

	// upload step 1:
	beforeUpload = (file) => {
		// console.log('beforupload');
		return true;
	};

	// upload step 2:
	customUpload = async (context) => {
		// console.log('###### customUpload: ', !!context && !!context.file && context.file.name);
		const { file, onSuccess, onError /*onProgress*/ } = context;

		const { onUpload } = this.props;
		if (!onUpload) {
			onError(new Error('No upload handler found!'), file);
			return;
		}

		try {
			// onProgress({percent: 36}, file);
			const response = await onUpload(file);
			// console.log({'customUpload response': response});
			if (response instanceof Error) throw response;

			onSuccess(response, file);
		} catch (err) {
			onError({ error: err }, file);
		}
	};

	// upload step 3:
	toHandleChange = ({ file, fileList, event }) => {
		console.log('toHandleChange', file, fileList);
		// console.log(`###### toHandleChange: ${file.name} (${file.status}) @ ${file.percent}%`, file, fileList, event);
		// fileList.forEach((f, i) => {
		//     console.log(`[${i}] ${f.name} (${f.status}) @ ${f.percent}%`);
		// })
		const f = _.find(fileList, { uid: file.uid });
		if (!f) {
			console.log('###### file no found (removed) ');
		} else if (!!f.response && !!f.response.result && !!f.response.preUrl) {
			f.url = f.response.preUrl + f.response.result.slice(1);
			f.preUrl = f.response.preUrl;
			f.key = f.response.result;
		}
		this.setState({ fileList: [ ...fileList ] });
	};

	beforeRemove = async (file) => {
		// console.log({'beforeRemove': file});

		if (!file || !file.key) return true;

		const { onDelete } = this.props;

		const result = await onDelete(file);
		// console.log({'result': result});
		if (result instanceof Error) {
			return false;
		} else return true;
	};

	render() {
		const { fileList } = this.state;
		const { onSave, limit, saveText, uploadText } = this.props;
		const length = fileList.length;
		return (
			<Fragment>
				<div>
					<Button type="primary" onClick={onSave}>
						{!!saveText ? saveText : '保存'}
					</Button>
				</div>
				<br />
				<Upload
					action={null}
					fileList={fileList}
					beforeUpload={this.beforeUpload}
					customRequest={this.customUpload}
					onRemove={this.beforeRemove}
					onChange={this.toHandleChange}
				>
					{!limit || length < limit ? (
						<Button>
							<Icon type="upload" /> {!!uploadText ? uploadText : '上传'}
						</Button>
					) : (
						''
					)}
				</Upload>
			</Fragment>
		);
	}
}
