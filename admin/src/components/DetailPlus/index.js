import React, { Component, Fragment } from 'react';
import {
    Tabs,
    Button,
    Skeleton,
} from 'antd';
import { merge } from 'lodash';

import BraftEditor from 'braft-editor';
import 'braft-editor/dist/index.css';

import config from '@/config';
import { apiUploadOneToQiniu } from '@/utils';
import ImageCropper from '@/components/ImageCropper';
import VideoEditor from '@/components/VideoEditor';
import EditableTable from '@/components/EditableTable';

export default class DetailPlus extends Component {

    state = {
        tabKey: 'basic',
        renderList: {}
    };

    componentDidMount() {
        const { defaultTab, tabs } = this.props;

        this.setState({
            tabKey: defaultTab || tabs[0].key,
            renderList: {
                basic: {
                    name: '基本信息'
                },
                image: {
                    name: '图片',
                    render: this.renderImage,
                    options: {},
                    renderValue: (data) => !data.thumbnail ? '' : data.thumbnailPath,
                    saveValue: async (file) => {
                        const thumbnail = await apiUploadOneToQiniu(file);
                        if (!!thumbnail && !!thumbnail.path) {
                            this.props.toSave({ thumbnail });
                        }
                    }
                },
                video: {
                    name: '视频',
                    render: this.renderVideo,
                    options: {},
                    renderValue: (data) => !data.video ? '' : data.videoPath,
                    saveValue: async (file) => {
                        const video = await apiUploadOneToQiniu(file);
                        if (!!video && !!video.path) {
                            this.props.toSave({ video });
                        }
                    }
                },
                text: {
                    name: '正文',
                    render: this.renderText,
                    options: {},
                    renderValue: (data) => BraftEditor.createEditorState(data.text),
                    saveValue: () => this.props.toSave({
                        text: this.editorRef.getValue().toHTML()
                    }),
                    uploadFn: async (context) => {
                        if (!context || !context.file) return;

                        const res = await apiUploadOneToQiniu(context.file);
                        if (!res) {
                            context.error({ error: '上传失败' });
                        } else {
                            context.progress(101);
                            context.success({ url: `${config.qiniu.domain}/${res.path}` });
                        }
                    }
                },
                editableTable: {
                    name: '表格',
                    render: this.rednerEditorTable,
                    options: {},
                    renderValue: (data) => BraftEditor.createEditorState(data.text),
                    saveValue: () => this.props.toSave({
                        text: this.editorRef.getValue().toHTML()
                    }),
                    uploadFn: async (context) => {
                        if (!context || !context.file) return;

                        const res = await apiUploadOneToQiniu(context.file);
                        if (!res) {
                            context.error({ error: '上传失败' });
                        } else {
                            context.progress(101);
                            context.success({ url: `${config.qiniu.domain}/${res.path}` });
                        }
                    }
                },
            }
        });
    }

    onTabChange = (tabKey) => {
        this.setState({ tabKey });
    };

    renderImage = (data, render) => {
        return <ImageCropper
            url={render.renderValue(data)}
            onUpload={render.saveValue}
            {...render.options}
        />
    }

    renderVideo = (data, render) => {
        return <VideoEditor
            url={render.renderValue(data)}
            onUpload={render.saveValue}
            {...render.options}
        />
    }

    renderText = (data, render) => {
        const editorProps = {
            placeholder: '请输入内容',
            contentFormat: 'html',
            contentId: data.id,
            value: render.renderValue(data),
            onSave: render.saveValue,
            media: {
                uploadFn: render.uploadFn,
            },
        };
        return (
            <Fragment>
                <Button type="primary" onClick={render.saveValue}>
                    保存
              </Button>
                <BraftEditor ref={(e) => (this.editorRef = e)} {...editorProps} />
            </Fragment>
        );
    }

    getRender = (tab, currentTab) => {
        const { renderList } = this.state;
        const { data } = this.props;
        const defaultRender = merge(renderList[tab.key], currentTab);
        const { render, key, name, tabKey } = defaultRender;

        if (!render) return '';

        return <Tabs.TabPane key={tabKey || key} tab={name}>{render(data, defaultRender)}</Tabs.TabPane>;
    }

    render() {
        const { data, tabs } = this.props;

        if (!data) return <Skeleton active loading />;

        return (
            <Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
                {tabs.map((tab, index) => this.getRender(tab, tabs[index]))}
            </Tabs>
        );
    }
}