import React, { Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import router from 'umi/router';
import { Tabs, Form, Input, InputNumber, Row, Col, Icon, TreeSelect, Button, Skeleton, message } from 'antd';


import config from '@/config';
import { apiUploadOne } from '@/utils';

import ImageCropper from '@/components/ImageCropper';
import VideoEditor from '@/components/VideoEditor';

import BraftEditor from 'braft-editor';
import 'braft-editor/dist/index.css';

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
	labelCol: { xs: { span: 24 }, sm: { span: 8 } },
	wrapperCol: { xs: { span: 24 }, sm: { span: 16 } }
};
const tailFormItemLayout = {
	wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } }
};

const MODEL_NAME = 'role';

@Form.create()
@connect(({ organization, role }) => ({
	organization,
	selectedNode: role.selectedNode,
	columns: role.columns
}))
export default class extends React.Component {
	state = {
		tabKey: 'basic'
	};

	componentDidMount() {
		this.loadData();
	}

	componentWillReceiveProps(nextProps) {
		const { match: { params } } = nextProps;
		if (this.props.match.params.id !== params.id) {
			this.loadData(params.id);
		}
	}

	loadData = (id) => {
		const { dispatch, match: { params } } = this.props;

		if (!!params.id) {
			if ('CREATE' !== params.id) {
				dispatch({
					type: `${MODEL_NAME}/detail`,
					payload: {
						id: id || params.id
					}
				});
			} else {
				dispatch({
					type: `${MODEL_NAME}/set`,
					payload: {
						selectedNode: {}
					}
				});
			}
		}

		dispatch({
			type: `organization/fetch`,
			payload: {}
		});
	};

	onTabChange = (tabKey) => {
		this.setState({ tabKey });
	};

	onThumbnailUpload = async (file) => {
		const { dispatch } = this.props;

		const res = await apiUploadOne(file);

		if (!!res && !!res.path) {

			dispatch({
				type: `${MODEL_NAME}/save`,
				payload: {
					thumbnail: res.path
				}
			});

		}
	};

	onVideoUpload = async (file) => {
		const { dispatch } = this.props;

		const res = await apiUploadOne(file);

		if (!!res && !!res.path) {

			dispatch({
				type: `${MODEL_NAME}/save`,
				payload: {
					video: res.path
				}
			});

		}
	};

	onEditorMediaUpload = async (context) => {
		if (!context || !context.file) return;

		const res = await apiUploadOne(context.file);
		if (!res) {
			context.error({ error: '上传失败' });
		} else {
			context.progress(101);
			context.success({ url: `${config.STATIC_ROOT}${res.path}` });
		}
	};

	resetHandler = () => {
		this.props.form.resetFields();
	};

	submitHandler = (e) => {
		e.preventDefault();

		const { dispatch, match: { params } } = this.props;

		this.props.form.validateFields((err, values) => {
			if (!!err || Object.keys(values).length === 0) {
				return;
			}

			values['publish_at'] = moment(values['publish_at']).format('YYYY-MM-DD HH:mm:ss');
			values['category'] = params.channel;

			dispatch({
				type: `${MODEL_NAME}/save`,
				payload: values
			});
		});
	};

	toSaveRichText = () => {
		this.props.dispatch({
			type: `${MODEL_NAME}/save`,
			payload: {
				text: this.editorRef.getValue().toHTML()
			}
		});
	};

	renderRichText = (content) => {
		const editorProps = {
			placeholder: '请输入内容',
			contentFormat: 'html',
			contentId: content.id,
			value: BraftEditor.createEditorState(content.text),
			onSave: this.toSaveRichText,
			media: {
				uploadFn: this.onEditorMediaUpload
			}
		};
		return (
			<Fragment>
				<Button type="primary" onClick={this.toSaveRichText}>
					保存
				</Button>
				<BraftEditor ref={(e) => (this.editorRef = e)} {...editorProps} />
			</Fragment>
		);
	};

	renderBasicForm = () => {
		const { selectedNode, columns, organization, form: { getFieldDecorator } } = this.props;

		const fields = columns.map(item => item.dataIndex);

		return (
			<Form onSubmit={this.submitHandler} className="panel-form">

				<Form.Item {...formItemLayout} label="名称">
					{getFieldDecorator('name', {
						initialValue: !selectedNode ? null : selectedNode['name'],
						rules: [
							{
								required: true,
								message: '名称不能为空'
							}
						]
					})(<Input {...formItemStyle} type="text" placeholder="请填写名称" />)}
				</Form.Item>

				<Form.Item {...formItemLayout} label="组织架构">
					{getFieldDecorator('organization', {
						initialValue: !selectedNode ? null : selectedNode['organization']['id'],
						rules: [
							{
								required: true,
								message: '组织架构不能为空'
							}
						]
					})(<TreeSelect {...formItemStyle} treeNodeFilterProp="title" showSearch treeDefaultExpandAll treeData={organization.data} />)}
				</Form.Item>

				<Form.Item {...formItemLayout} label="描述">
					{getFieldDecorator('desc', {
						initialValue: !selectedNode ? 0 : selectedNode['desc']
					})(<Input {...formItemStyle} placeholder="请填写描述" />)}
				</Form.Item>

				<Form.Item {...formItemLayout} label="排序">
					{getFieldDecorator('sort', {
						initialValue: !selectedNode ? 0 : selectedNode['sort']
					})(<InputNumber min={0} {...formItemStyle} placeholder="请填写排序" />)}
				</Form.Item>


				<Form.Item {...tailFormItemLayout}>
					<Row>
						<Col span={3}>
							<Button onClick={this.resetHandler}>重置</Button>
						</Col>
						<Col>
							<Button type="primary" htmlType="submit">
								{!selectedNode['id'] ? '新增' : '保存'}
							</Button>
						</Col>
					</Row>
				</Form.Item>
			</Form>
		);
	};

	render() {
		const { selectedNode, columns } = this.props;

		if (!selectedNode) return <Skeleton active loading />;

		const fields = columns.map(item => item.dataIndex);

		return (
			<Fragment>
				<Button onClick={() => router.go(-1)}>
					<Icon type="arrow-left" />返回
				</Button>
				<Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
					<Tabs.TabPane tab="基本信息" key="basic">
						{this.renderBasicForm()}
					</Tabs.TabPane>
					{selectedNode.id && fields.includes('thumbnailPath') ? (
						<Tabs.TabPane tab="图片" key="thumbnail">
							<ImageCropper
								url={!selectedNode.thumbnail ? '' : selectedNode.thumbnailPath}
								onUpload={this.onThumbnailUpload}
							/>
						</Tabs.TabPane>
					) : null}
					{selectedNode.id && fields.includes('videoPath') ? (
						<Tabs.TabPane tab="视频" key="video">
							<VideoEditor
								url={!selectedNode.video ? '' : selectedNode.videoPath}
								onUpload={this.onVideoUpload}
								width={500}
							/>
						</Tabs.TabPane>
					) : null}
					{selectedNode.id && fields.includes('text') ? (
						<Tabs.TabPane tab="正文" key="text">
							{this.renderRichText(selectedNode)}
						</Tabs.TabPane>
					) : null}
				</Tabs>
			</Fragment>
		);
	}
}
