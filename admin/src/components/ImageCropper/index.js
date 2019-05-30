import React, { Fragment } from 'react';
import { Modal, Upload, Icon } from 'antd';
import AvatarEditor from 'react-avatar-editor';

const gEditorStyle = { display: 'block', margin: '10px auto' };

export function dataURLtoBlob(dataurl) {
	const arr = dataurl.split(',');
	const mime = arr[0].match(/:(.*?);/)[1];
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new Blob([u8arr], {
		type: mime
	});
}

export default class ImageCropper extends React.Component {
	state = {
		imageFile: null,
		scale: 1,
		width: 400,
		height: 200,
		borderRadius: 0
	};
	componentDidMount() {
		const { scale, width, height, borderRadius } = this.props;

		this.setState((state) => ({
			...state,
			scale: scale || 1,
			width: width || 400,
			height: height || 200,
			borderRadius: borderRadius || 0
		}));

		const self = this;
		const scrollFunc = function (e) {
			// var direct = 0;
			e = e || window.event;
			if (e.wheelDelta) {
				//判断浏览器IE，谷歌滑轮事件
				if (e.wheelDelta > 0) {
					//当滑轮向上滚动时
					self.setState({ scale: self.state.scale + 0.1 });
				}
				if (e.wheelDelta < 0) {
					//当滑轮向下滚动时
					self.setState({ scale: self.state.scale - 0.1 });
				}
			} else if (e.detail) {
				//Firefox滑轮事件
				if (e.detail > 0) {
					//当滑轮向上滚动时
					self.setState({ scale: self.state.scale + 0.1 });
				}
				if (e.detail < 0) {
					//当滑轮向下滚动时
					self.setState({ scale: self.state.scale - 0.1 });
				}
			}
		};
		if (document.addEventListener) {
			document.addEventListener('DOMMouseScroll', scrollFunc, false);
		} // W3C
		window.onmousewheel = document.onmousewheel = scrollFunc; // IE/Opera/Chrome
	}
	componentWillReceiveProps(nextProps) {
		const { scale, width, height, borderRadius } = this.props;

		this.setState((state) => ({
			...state,
			scale: scale || 1,
			width: width || 400,
			height: height || 200,
			borderRadius: borderRadius || 0
		}));
	}

	setEditorRef = (editor) => {
		if (editor) this.editor = editor;
	};
	beforeUpload = (imageFile) => {
		this.setState({ imageFile });
		return false;
	};
	toUpload = () => {
		const { onUpload } = this.props;
		const { imageFile } = this.state;
		if (!!onUpload && !!imageFile && !!this.editor) {
			const fakefile = dataURLtoBlob(this.editor.getImageScaledToCanvas().toDataURL('image/png'));

			fakefile.name = imageFile.name;
			onUpload(fakefile);
		}
		this.setState({ imageFile: null });
	};

	toCloseModal = () => {
		const { onCancel } = this.props;
		if (!!onCancel) onCancel();
		this.setState({ imageFile: null });
	};

	onScaleChange = (value) => {
		this.setState((state) => ({
			...state,
			scale: value
		}));
	};

	onWidthChange = (value) => {
		this.setState((state) => ({
			...state,
			width: value
		}));
	};

	onHeightChange = (value) => {
		this.setState((state) => ({
			...state,
			height: value
		}));
	};

	onRadiusChange = (value) => {
		this.setState((state) => ({
			...state,
			borderRadius: value
		}));
	};

	render() {
		const { imageFile, scale, width, height, borderRadius } = this.state;
		const { imageUrl } = this.props;

		return (
			<Fragment>
				<Upload action={null} showUploadList={false} beforeUpload={this.beforeUpload}>
					<div
						style={{
							textAlign: 'center',
							width,
							height,
							border: '1px #ccc dashed',
							position: 'relative',
							cursor: 'pointer'
						}}
					>
						{!imageUrl ? (
							<Fragment>
								<p className="ant-upload-drag-icon" style={{ width, paddingTop: height * 0.3 }}>
									<Icon type="upload" />
								</p>
								<p className="ant-upload-text">点击上传图片</p>
								<p className="ant-upload-hint">图片大小不超过2M</p>
							</Fragment>
						) : (
								<img style={{ maxWidth: width }} src={imageUrl} />
							)}
					</div>
				</Upload>

				<Modal
					visible={!!imageFile}
					title="图片裁剪"
					okText="确认"
					cancelText="取消"
					width={width + 100}
					height={height}
					onOk={this.toUpload}
					onCancel={this.toCloseModal}
				>
					<AvatarEditor
						border={2}
						color={[72, 118, 255, 1]}
						style={gEditorStyle}
						ref={this.setEditorRef}
						image={imageFile}
						scale={scale}
						width={width}
						height={height}
						borderRadius={borderRadius}
					/>
					<br />
					<h3>{`请上传 ${width}px（宽） * ${height}px（高） 大小的图片`}</h3>
				</Modal>
			</Fragment>
		);
	}
}
