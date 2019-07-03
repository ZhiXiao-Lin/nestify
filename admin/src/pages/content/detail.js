import React, { Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import router from 'umi/router';
import {
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Icon,
  Tabs,
  DatePicker,
  Button,
  Skeleton,
  TreeSelect,
} from 'antd';

import ImageCropper from '@/components/ImageCropper';
import VideoEditor from '@/components/VideoEditor';
import RichText from '@/components/RichText';
import config from '@/config';
import { apiUploadOne } from '@/utils';

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const MODEL_NAME = 'content';

@Form.create()
@connect(({ content, category }) => ({
  category,
  selectedNode: content.selectedNode,
  columns: content.columns,
}))
export default class extends React.Component {
  state = {
    tabKey: 'basic',
  };

  componentDidMount() {
    this.loadData();
  }

  componentWillReceiveProps(nextProps) {
    const {
      match: { params },
    } = nextProps;
    if (this.props.match.params.id !== params.id) {
      this.loadData(params.id);
    }
  }

  onTabChange = (tabKey) => {
    this.setState({ tabKey });
  };

  init = (channel) => {
    let columns = [];
    let fields = [];
    let showQueryCondition = false;

    switch (channel) {
      default:
        columns = [
          {
            title: '详情',
            dataIndex: 'id',
          },
          {
            title: '图片',
            dataIndex: 'thumbnailPath',
            render: (val) => (!val ? null : <img style={{ width: '60px' }} src={val} />),
          },
          {
            title: '视频',
            dataIndex: 'videoPath',
            render: (val) => val,
          },
          {
            title: '标题',
            dataIndex: 'title',
          },
          {
            title: '作者',
            dataIndex: 'author',
          },
          {
            title: '分类',
            dataIndex: 'category',
            render: (val) => val.name,
          },
          {
            title: '来源',
            dataIndex: 'source',
          },
          {
            title: '摘要',
            dataIndex: 'summary',
          },
          {
            title: '地址',
            dataIndex: 'address',
          },
          {
            title: '排序',
            dataIndex: 'sort',
            sorter: true,
          },
          {
            title: '浏览量',
            dataIndex: 'views',
            sorter: true,
          },
          {
            title: '发布时间',
            dataIndex: 'publish_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            title: '修改时间',
            dataIndex: 'update_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            title: '创建时间',
            dataIndex: 'create_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            title: '正文',
            dataIndex: 'text',
            render: (val) => '...',
          },
        ];

        fields = [
          'id',
          'thumbnailPath',
          'title',
          'author',
          'source',
          'sort',
          'views',
          'publish_at',
          'update_at',
        ];
        showQueryCondition = true;
        break;
    }

    this.props.dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        columns,
        fields,
        showQueryCondition,
      },
    });
  };

  loadData = (id) => {
    const {
      dispatch,
      match: { params },
    } = this.props;

    if (!!params.id) {
      dispatch({
        type: `${MODEL_NAME}/detail`,
        payload: {
          id: id || params.id,
        },
      });
    } else {
      dispatch({
        type: `${MODEL_NAME}/set`,
        payload: {
          selectedNode: {},
        },
      });
    }

    dispatch({
      type: 'category/fetch',
      payload: {},
    });
  };

  resetHandler = () => {
    this.props.form.resetFields();
  };

  submitHandler = (e) => {
    e.preventDefault();

    const { dispatch } = this.props;

    this.props.form.validateFields((err, values) => {
      if (!!err || Object.keys(values).length === 0) {
        return;
      }

      values['publish_at'] = moment(values['publish_at']).format('YYYY-MM-DD HH:mm:ss');

      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: values,
      });
    });
  };

  onThumbnailUpload = async (file) => {
    const res = await apiUploadOne(file);
    if (!!res && !!res.path) {
      this.toSave({ thumbnail: res });
    }
  };

  onVideoUpload = async (file) => {
    const res = await apiUploadOne(file);
    if (!!res && !!res.path) {
      this.toSave({ video: res });
    }
  };

  onMediaUpload = async (context) => {
    if (!context || !context.file) return;

    const res = await apiUploadOne(context.file);
    if (!res) {
      context.error({ error: '上传失败' });
    } else {
      context.progress(101);
      context.success({ url: res.url });
    }
  };

  renderBasicForm = () => {
    const {
      category,
      selectedNode,
      form: { getFieldDecorator },
    } = this.props;

    return (
      <Form onSubmit={this.submitHandler} className="panel-form">
        <Form.Item {...formItemLayout} label="标题">
          {getFieldDecorator('title', {
            initialValue: !selectedNode ? null : selectedNode['title'],
            rules: [
              {
                required: true,
                message: '标题不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写标题" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="发布时间">
          {getFieldDecorator('publish_at', {
            initialValue: !selectedNode['publish_at'] ? null : moment(selectedNode['publish_at']),
            rules: [
              {
                required: true,
                message: '发布时间不能为空',
              },
            ],
          })(<DatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder="请选择发布日期时间" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="分类">
          {getFieldDecorator('category', {
            initialValue: !selectedNode
              ? null
              : !selectedNode['category']
                ? null
                : selectedNode['category']['id'],
            rules: [
              {
                required: true,
                message: '请选择分类',
              },
            ],
          })(
            <TreeSelect
              treeNodeFilterProp="title"
              showSearch
              treeDefaultExpandAll
              treeData={category.data}
            />
          )}
        </Form.Item>
        <Form.Item {...formItemLayout} label="作者">
          {getFieldDecorator('author', {
            initialValue: !selectedNode ? null : selectedNode['author'],
          })(<Input {...formItemStyle} type="text" placeholder="请填写作者" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="来源">
          {getFieldDecorator('source', {
            initialValue: !selectedNode ? null : selectedNode['source'],
          })(<Input {...formItemStyle} type="text" placeholder="请填写来源" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="原文地址">
          {getFieldDecorator('address', {
            initialValue: !selectedNode ? null : selectedNode['address'],
          })(<Input {...formItemStyle} type="text" placeholder="请填写原文地址" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="排序">
          {getFieldDecorator('sort', {
            initialValue: !selectedNode ? 0 : selectedNode['sort'],
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

  toSaveRichText = (text) => {
    this.toSave({ text });
  };

  toSave = (payload) => {
    this.props.dispatch({
      type: `${MODEL_NAME}/save`,
      payload,
    });
  };

  render() {
    const { selectedNode } = this.props;

    if (!selectedNode) return <Skeleton active loading />;

    return (
      <Fragment>
        <Button onClick={() => router.go(-1)}>
          <Icon type="arrow-left" />
          返回
        </Button>
        <Tabs onChange={this.onTabChange} activeKey={this.state.tabKey}>
          <Tabs.TabPane key="basic" tab="基础设置">
            {this.renderBasicForm()}
          </Tabs.TabPane>
          {selectedNode.id ? (
            <Tabs.TabPane key="image" tab="图片">
              <ImageCropper
                url={!selectedNode.thumbnail ? '' : selectedNode.thumbnailPath}
                onUpload={this.onThumbnailUpload}
              />
            </Tabs.TabPane>
          ) : null}
          {selectedNode.id ? (
            <Tabs.TabPane key="video" tab="视频">
              <VideoEditor
                url={!selectedNode.video ? '' : selectedNode.videoPath}
                onUpload={this.onVideoUpload}
              />
            </Tabs.TabPane>
          ) : null}
          {selectedNode.id ? (
            <Tabs.TabPane key="richtext" tab="正文">
              <RichText
                onSave={this.toSaveRichText}
                html={selectedNode.text}
                contentId={selectedNode.id}
                onMediaUpload={this.onMediaUpload}
              />
            </Tabs.TabPane>
          ) : null}
        </Tabs>
      </Fragment>
    );
  }
}
