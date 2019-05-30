import React, { Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import router from 'umi/router';
import { Tabs, Form, Input, DatePicker, Button, Divider } from 'antd';
import { upload2Backend, apiDelete } from '@/utils/apirequest';

import ImageCropper from '@/components/ImageCropper';
import ImageGallery, { transformFileObj } from '@/components/ImageGallery';
import DynamicKV from '@/components/DynamicKV';
import ComboSpec from '@/components/ComboSpec';
import FileStore from '@/components/FileStore';
import TagGroups from '@/components/TagGroups';
import MapStack from '@/components/MapStack';
import ColorPicker from '@/components/ColorPicker';

import BraftEditor from 'braft-editor';
import 'braft-editor/dist/index.css';

import { contentCategories, contentMenu } from './contents.basic';
import config from '../../utils/config';

const gApiUploadBackend = config.API_URL.UPLOAD.BACKEND_STORAGE;

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
	labelCol: { xs: { span: 24 }, sm: { span: 8 } },
	wrapperCol: { xs: { span: 24 }, sm: { span: 16 } }
};
const tailFormItemLayout = {
	wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } }
};

@Form.create()
@connect(({ contents, maindata }) => ({
	selectedNode: contents.selectedNode,
	contents: contents.records,
	tagsRoot: _.find(maindata.records, { name: '内容标签' }),
	theContent: _.find(contents.records, { id: contents.recordId }) || {}
}))
export default class ContentDetailsForm extends React.Component {
	state = {
		tabKey: 'basic'
	};

	onTabChange = (tabKey) => {
		this.setState({ tabKey });
	};
	toSetEditorInstance = (ins) => {
		this.editor = ins;
	};
	toGetGalleryInstance = (ins) => {
		this.gallery = ins;
	};
	toGetDKVInstance = (ins) => {
		this.DynamicKV = ins;
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
	toSaveRichText = () => {
		const { editor } = this;
		if (!editor) return;

		this.toUpdateExist({
			ex_info: { richtext: { html: editor.getValue().toHTML() } }
		});
	};
	submitHandler = (e) => {
		e.preventDefault();

		const { theContent } = this.props;

		this.props.form.validateFields((err, values) => {
			if (!!err || Object.keys(values).length === 0) {
				return;
			}
			values['tags'] = values['tags'] ? JSON.stringify(values['tags']) : null;
			if (!theContent['id']) {
				// console.log({ values });
				this.toCreateNew([
					{
						tree_path: `${values['tree_path']}.${values['name']}`,
						category: contentCategories
							.filter(
								(category) =>
									contentMenu[this.props.match.params.channel].categories.indexOf(category.value) >= 0
							)
							.pop().value,
						tags: values['tags'],
						author: values['author'] || null,
						title: values['title'] || null,
						subtitle: values['subtitle'] || null,
						release_datetime: !values['release_datetime']
							? null
							: values['release_datetime'].format('YYYY-MM-DD HH:mm:ss')
					}
				]);
			} else {
				this.toUpdateExist(values);
			}
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
	resetHandler = () => {
		this.props.form.resetFields();
	};

	renderBasicForm = (selectedNode, theContent, getFieldDecorator) => (
		<Form onSubmit={this.submitHandler} className="panel-form">
			<Form.Item {...formItemLayout} label="路径" style={{ display: 'none' }}>
				{getFieldDecorator('tree_path', {
					initialValue:
						theContent['tree_path'] ||
						selectedNode['tree_path'] ||
						contentMenu[this.props.match.params.channel].rootPath,
					rules: [{ required: true, message: '不能为空' }]
				})(<Input {...formItemStyle} disabled={true} type="text" />)}
			</Form.Item>
			{!theContent['id'] && (
				<Form.Item {...formItemLayout} label="名称">
					{getFieldDecorator('name', {
						initialValue: theContent['name'],
						rules: [
							{
								required: true,
								message: '分类名称不能为空'
							}
						]
					})(<Input {...formItemStyle} type="text" placeholder="请设置分类名称" />)}
				</Form.Item>
			)}
			<Form.Item {...formItemLayout} label="作者">
				{getFieldDecorator('author', {
					initialValue: theContent['author'],
					rules: [
						{
							required: true,
							message: '作者不能为空'
						}
					]
				})(<Input {...formItemStyle} type="text" placeholder="请设置作者" />)}
			</Form.Item>
			<Form.Item {...formItemLayout} label="标题">
				{getFieldDecorator('title', {
					initialValue: theContent['title'],
					rules: [
						{
							required: true,
							message: '标题不能为空'
						}
					]
				})(<Input {...formItemStyle} type="text" placeholder="请设置标题" />)}
			</Form.Item>
			<Form.Item {...formItemLayout} label="副标题">
				{getFieldDecorator('subtitle', {
					initialValue: theContent['subtitle'],
					rules: [
						{
							required: false
						}
					]
				})(<Input {...formItemStyle} type="text" placeholder="请设置副标题" />)}
			</Form.Item>
			<Form.Item {...formItemLayout} label="发布时间">
				{getFieldDecorator('release_datetime', {
					initialValue: !!theContent['release_datetime'] ? moment(theContent['release_datetime']) : '',
					rules: [{ required: false }]
				})(
					// <Input {...formItemStyle} type="text" placeholder="请设置发布时间" />
					<DatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder="选择发布日期时间" />
				)}
			</Form.Item>
			<Form.Item {...tailFormItemLayout}>
				<Button onClick={this.resetHandler}>重置</Button>
				<Button type="primary" htmlType="submit">
					{!theContent['id'] ? '新增' : '更新'}
				</Button>
			</Form.Item>
		</Form>
	);
	renderRichText = (html, contenId) => {
		const editorProps = {
			placeholder: '请输入内容',
			contentFormat: 'html',
			contentId: contenId,
			value: BraftEditor.createEditorState(html),
			onSave: this.toSaveRichText,
			media: {
				uploadFn: this.onEditorMediaUpload
			}
		};
		return (
			<Fragment>
				<Button type="primary" size="small" onClick={this.toSaveRichText}>
					保存
				</Button>
				<BraftEditor ref={this.toSetEditorInstance} {...editorProps} />
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
		const { selectedNode, theContent, form: { getFieldDecorator }, tagsRoot } = this.props;

		const tagstring = theContent.tags;
		const sputags = !tagsRoot ? [] : tagsRoot.children || [];
		const html = !theContent.ex_info
			? null
			: !theContent.ex_info.richtext ? null : theContent.ex_info.richtext.html;
		const gallery = !theContent.ex_info ? null : theContent.ex_info.gallery;
		const dkv = !theContent.ex_info ? null : theContent.ex_info.DynamicKV;
		const fileStore = !theContent.ex_info ? null : theContent.ex_info.fileStore;
		return (
			<Fragment>
				<Button onClick={() => router.go(-1)}>返回</Button>
				<Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
					<Tabs.TabPane tab="基本信息" key="basic">
						{this.renderBasicForm(selectedNode || {}, theContent, getFieldDecorator)}
					</Tabs.TabPane>
					{!theContent.id ? null : (
						<Tabs.TabPane tab="图片" key="thumbnail">
							<ImageCropper
								imageUrl={!theContent.thumbnail ? '' : theContent.thumbnail.url}
								onUpload={this.onThumbnailUpload}
							/>
						</Tabs.TabPane>
					)}
					{!theContent.id ? null : (
						<Tabs.TabPane tab="图片集" key="gallery">
							<ImageGallery
								mode="edit"
								limit={3}
								initialValue={gallery}
								onUpload={this.onCommonUpload}
								onDelete={this.toDeleteFile}
								onSave={this.toSaveGallery}
								ref={this.toGetGalleryInstance}
							/>
						</Tabs.TabPane>
					)}
					{!theContent.id ? null : (
						<Tabs.TabPane tab="富文本" key="richtext">
							{this.renderRichText(html, theContent.id)}
						</Tabs.TabPane>
					)}
					{!theContent.id ? null : (
						<Tabs.TabPane tab="附件仓库" key="attachment">
							<FileStore
								ref={(el) => (this.fileStore = el)}
								initialValue={fileStore}
								onUpload={this.onCommonUpload}
								onDelete={this.toDeleteFile}
								onSave={this.toSaveFileStore}
							/>
						</Tabs.TabPane>
					)}
					{!theContent.id ? null : (
						<Tabs.TabPane tab="内容标签" key="tags">
							<TagGroups
								ref={(el) => (this.tagGroups = el)}
								onSave={this.toSaveTags}
								tagGroups={sputags.map((t) => ({ name: t.name, tags: t.ex_info.tags }))}
								tagString={tagstring}
							/>
						</Tabs.TabPane>
					)}
					{!theContent.id ? null : (
						<Tabs.TabPane tab="扩展属性" key="extra">
							<DynamicKV initialValue={dkv} ref={this.toGetDKVInstance} onSave={this.toSaveDynamicKV} />
						</Tabs.TabPane>
					)}
					{!theContent.id ? null : (
						<Tabs.TabPane tab="地图集" key="map">
							<Tabs type="card" tabPosition="right">
								<Tabs.TabPane tab="图层图例" key="layers">
									<ColorPicker />
									<Divider />
									<ComboSpec
										groupInfoColProps={[
											{ key: 'name', title: '图例名称' },
											{ key: 'order', title: '图例排序' },
											{ key: 'iconsrc', title: '图例图标' },
											{ key: 'iconcolor', title: '图例颜色' }
										]}
										subInfoColProps={[{ key: 'name', title: '图标名称' }]}
										specInfo={this.toConvertGroupsitemsToSubinfo(theContent.ex_info)}
										onSave={this.toSaveLegends}
									/>
									<ComboSpec
										groupInfoColProps={[
											{ key: 'name', title: '底图名称' },
											{ key: 'imgsrc', title: '底图链接' }
										]}
										subInfoColProps={null}
										specInfo={this.toConvertImagesToGroupinfo(theContent.ex_info)}
										onSave={this.toSaveImages}
									/>
								</Tabs.TabPane>
								<Tabs.TabPane tab="图例定位" key="locate">
									<MapStack exinfo={theContent.ex_info} submitHandler={this.onMapStackSubmit} />
								</Tabs.TabPane>
								<Tabs.TabPane tab="图例预览" key="preview">
									<MapStack exinfo={theContent.ex_info} />
								</Tabs.TabPane>
							</Tabs>
						</Tabs.TabPane>
					)}
				</Tabs>
			</Fragment>
		);
	}
}
