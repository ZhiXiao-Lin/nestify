import React, { Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import router from 'umi/router';
import { Tabs, Form, Input, InputNumber, Row, Col, Icon, DatePicker, Button, Skeleton, message } from 'antd';

import config from '@/config';
import { apiUploadOne } from '@/utils';

import ImageCropper from '@/components/ImageCropper';
import ImageGallery from '@/components/ImageGallery';
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

const MODEL_NAME = 'contents';

@Form.create()
@connect(({ contents }) => ({
	selectedNode: contents.selectedNode
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
		const { selectedNode, form: { getFieldDecorator } } = this.props;
		return (
			<Form onSubmit={this.submitHandler} className="panel-form">
				<Form.Item {...formItemLayout} label="标题">
					{getFieldDecorator('title', {
						initialValue: !selectedNode ? null : selectedNode['title'],
						rules: [
							{
								required: true,
								message: '标题不能为空'
							}
						]
					})(<Input {...formItemStyle} type="text" placeholder="请填写标题" />)}
				</Form.Item>
				<Form.Item {...formItemLayout} label="作者">
					{getFieldDecorator('author', {
						initialValue: !selectedNode ? null : selectedNode['author']
					})(<Input {...formItemStyle} type="text" placeholder="请填写作者" />)}
				</Form.Item>
				<Form.Item {...formItemLayout} label="来源">
					{getFieldDecorator('source', {
						initialValue: !selectedNode ? null : selectedNode['source']
					})(<Input {...formItemStyle} type="text" placeholder="请填写来源" />)}
				</Form.Item>
				<Form.Item {...formItemLayout} label="排序">
					{getFieldDecorator('sort', {
						initialValue: !selectedNode ? 0 : selectedNode['sort']
					})(<InputNumber min={0} {...formItemStyle} placeholder="请填写排序" />)}
				</Form.Item>
				<Form.Item {...formItemLayout} label="发布时间">
					{getFieldDecorator('publish_at', {
						initialValue: !selectedNode['publish_at'] ? null : moment(selectedNode['publish_at']),
						rules: [
							{
								required: true,
								message: '发布时间不能为空'
							}
						]
					})(
						<DatePicker
							showTime
							format="YYYY-MM-DD HH:mm:ss"
							locale={{
								lang: {
									placeholder: 'Select date',
									rangePlaceholder: ['开始时间', '结束时间'],
									today: '今天',
									now: '现在',
									backToToday: 'Back to today',
									ok: 'Ok',
									clear: 'Clear',
									month: 'Month',
									year: 'Year',
									timeSelect: '选择时间',
									dateSelect: '选择日期',
									monthSelect: 'Choose a month',
									yearSelect: 'Choose a year',
									decadeSelect: 'Choose a decade',
									yearFormat: 'YYYY',
									dateFormat: 'M/D/YYYY',
									dayFormat: 'D',
									dateTimeFormat: 'M/D/YYYY HH:mm:ss',
									monthFormat: 'MMMM',
									monthBeforeYear: true,
									previousMonth: 'Previous month (PageUp)',
									nextMonth: 'Next month (PageDown)',
									previousYear: 'Last year (Control + left)',
									nextYear: 'Next year (Control + right)',
									previousDecade: 'Last decade',
									nextDecade: 'Next decade',
									previousCentury: 'Last century',
									nextCentury: 'Next century'
								}
							}}
							placeholder="请选择发布日期时间"
						/>
					)}
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
		const { selectedNode } = this.props;

		if (!selectedNode) return <Skeleton active loading />;

		return (
			<Fragment>
				<Button onClick={() => router.go(-1)}>
					<Icon type="arrow-left" />返回
				</Button>
				<Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
					<Tabs.TabPane tab="基本信息" key="basic">
						{this.renderBasicForm()}
					</Tabs.TabPane>
					{!selectedNode.id ? null : (
						<Tabs.TabPane tab="缩略图" key="thumbnail">
							<ImageCropper
								imageUrl={!selectedNode.thumbnail ? '' : selectedNode.thumbnailPath}
								onUpload={this.onThumbnailUpload}
							/>
						</Tabs.TabPane>
					)}
					{!selectedNode.id ? null : (
						<Tabs.TabPane tab="视频编辑器" key="video">
							<VideoEditor
								imageUrl={!selectedNode.thumbnail ? '' : selectedNode.thumbnailPath}
								onUpload={this.onThumbnailUpload}
							/>
						</Tabs.TabPane>
					)}
					{!selectedNode.id ? null : (
						<Tabs.TabPane tab="正文" key="richtext">
							{this.renderRichText(selectedNode)}
						</Tabs.TabPane>
					)}
					{!selectedNode.id ? null : (
						<Tabs.TabPane tab="图片集" key="images">
							<ImageGallery
								mode="edit"
								limit={3}
							// initialValue={gallery}
							// onUpload={this.onCommonUpload}
							// onDelete={this.toDeleteFile}
							// onSave={this.toSaveGallery}
							// ref={this.toGetGalleryInstance}
							/>
						</Tabs.TabPane>
					)}
				</Tabs>
			</Fragment>
		);
	}
}
