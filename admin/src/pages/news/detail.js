import React, { Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import router from 'umi/router';
import { Tabs, Form, Input, InputNumber, Row, Col, Icon, DatePicker, Button, Divider, Skeleton } from 'antd';
import { upload2Backend, apiDelete } from '@/utils/apirequest';

import ImageGallery, { transformFileObj } from '@/components/ImageGallery';

import ImageCropper from '@/components/ImageCropper';
import FileStore from '@/components/FileStore';

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
			dispatch({
				type: `${MODEL_NAME}/detail`,
				payload: {
					id: id || params.id
				}
			});
		}
	};

	onTabChange = (tabKey) => {
		this.setState({ tabKey });
	};

	toUpload = async (file) => {
		if (!file || !file.name) return new Error('Invalid parameter!');

		const { theContent } = this.props;
		if (!theContent.id) return new Error('Invalid content id');

		try {
			const result = await upload2Backend(
				file,
				'contents',
				'contents',
				`${theContent.id}_${moment().format('YYYYMMDDHHmmss')}_${file.name}`,
				{ action: 'RENAME' }
			);
			if (!result || !result.action || result.action !== 'RENAME' || !result.preUrl || !result.result) {
				return new Error('Unexpected result!');
			} else return result;
		} catch (err) {
			return err;
		}
	};
	onCommonUpload = async (file) => {
		const response = await this.toUpload(file);
		// console.log({'onGallary response': response});
		if (!response || response.action !== 'RENAME' || !response.preUrl || !response.result)
			return new Error('upload faile');
		return response;
	};
	onThumbnailUpload = async (blob) => {
		const response = await this.toUpload(blob);
		if (response instanceof Error) {
			console.error('Thumbnail upload error: ', response);
		} else {
			// console.log(response);
			this.toUpdateExist({
				thumbnail: {
					url: response.preUrl + response.result.slice(1),
					target: response.result
				}
			});
		}
	};
	onEditorMediaUpload = async (context) => {
		if (!context || !context.file) return;

		const result = await this.toUpload(context.file);
		if (result instanceof Error) {
			console.error('BraftEditor upload error: ', err);
			context.error({ error: err });
		} else {
			context.progress(101);
			context.success({ url: result.preUrl + result.result.slice(1) });
		}
	};
	toDeleteFile = async (file) => {
		const response = await apiDelete(gApiUploadBackend, {
			filename: file.key
		});
		// console.log({'toDeleteFile response': response});
		if (!response || response.action !== 'REMOVE' || !response.result) return new Error('delete faile');
		return response;
	};
	toSaveTags = () => {
		if (!this.tagGroups) return;
		this.toUpdateExist({ tags: this.tagGroups.generateResult() });
	};
	toSaveDynamicKV = () => {
		// console.log({'DynamicKV state': this.DynamicKV.state});
		if (!this.DynamicKV) return;
		const value = this.DynamicKV.state.values.filter((kv) => !!kv.key).reduce((res, cur) => {
			res[cur.key] = cur.value;
			return res;
		}, {});
		// console.log(value);
		this.toUpdateExist({ ex_info: { DynamicKV: value } });
	};
	toSaveGallery = () => {
		// console.log({'gallery state': this.gallery.state});
		if (!this.gallery) return;
		this.toUpdateExist({
			ex_info: { gallery: this.gallery.state.imageFiles.map((f) => transformFileObj(f)) }
		});
	};
	toSaveFileStore = () => {
		// console.log({ 'filestore state': this.fileStore.state });
		if (!this.fileStore) return;
		this.toUpdateExist({
			ex_info: { fileStore: this.fileStore.state.fileList.map((f) => FileStore.transformFileObj(f)) }
		});
	};

	onMapStackSubmit = (exinfo) => {
		if (_.isEmpty(exinfo)) return;
		this.toUpdateExist({
			ex_info: exinfo
		});
	};
	toCreateNew = (payload) => {
		// console.log({toCreateNew: payload});
		this.props.dispatch({
			type: 'contents/create',
			payload
		});
	};
	toUpdateExist = (newvalue) => {
		const { theContent } = this.props;
		if (!theContent.id) return;

		if (!!newvalue.ex_info) {
			newvalue.ex_info = {
				...theContent.ex_info,
				...newvalue.ex_info
			};
		}

		this.props.dispatch({
			type: 'contents/update',
			payload: {
				criteria: { obj: { id: theContent['id'] } },
				newvalue
			}
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
									rangePlaceholder: [ '开始时间', '结束时间' ],
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
	toConvertSubinfoToGroupsitems = ({ groupInfo, subInfo }) => {
		if (_.isEmpty(groupInfo) || _.isEmpty(subInfo)) {
			return {};
		} else {
			return {
				groupsinfo: groupInfo,
				groupsitems: subInfo
			};
		}
	};
	toConvertGroupsitemsToSubinfo = (exinfo) => {
		if (!exinfo) {
			return null;
		} else {
			return {
				groupInfo: exinfo.groupsinfo,
				subInfo: exinfo.groupsitems
			};
		}
	};
	toConvertImagesToGroupinfo = (exinfo) => {
		if (_.isEmpty(exinfo) || _.isEmpty(exinfo.images)) {
			return null;
		} else {
			return {
				groupInfo: exinfo.images
			};
		}
	};
	toConvertGroupinfoToImages = (groupInfo) => {
		if (_.isEmpty(groupInfo)) {
			return [];
		} else {
			return {
				images: groupInfo
			};
		}
	};
	toSaveLegends = (specInfo) => {
		const ex_info = this.props.theContent.ex_info || {};
		const savedExinfo = this.toConvertSubinfoToGroupsitems(specInfo);
		Object.assign(ex_info, savedExinfo);
		this.toUpdateExist({ ex_info });
	};
	toSaveImages = ({ groupInfo }) => {
		const ex_info = this.props.theContent.ex_info || {};
		const imagesObj = this.toConvertGroupinfoToImages(groupInfo);
		const layersBounds = {};
		groupInfo.forEach((img) => {
			layersBounds[img.name] = {};
		});
		Object.assign(ex_info, imagesObj, { layersBounds });
		this.toUpdateExist({ ex_info });
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
								imageUrl={!selectedNode.thumbnail ? '' : selectedNode.thumbnail}
								onUpload={this.onThumbnailUpload}
							/>
						</Tabs.TabPane>
					)}
					{!selectedNode.id ? null : (
						<Tabs.TabPane tab="正文" key="richtext">
							{this.renderRichText(selectedNode)}
						</Tabs.TabPane>
					)}
				</Tabs>
			</Fragment>
		);
	}
}
