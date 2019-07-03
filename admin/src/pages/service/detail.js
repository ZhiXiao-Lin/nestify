import React, { Fragment } from 'react';
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
  Button,
  Skeleton,
  TreeSelect,
} from 'antd';

import ImageCropper from '@/components/ImageCropper';
import Album from '@/components/Album';
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

const MODEL_NAME = 'service';

@Form.create()
@connect(({ service, serviceCategory }) => ({
  category: serviceCategory,
  selectedNode: service.selectedNode,
  columns: service.columns,
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
      type: 'serviceCategory/fetch',
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

      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: values,
      });
    });
  };

  onCoverUpload = async (file) => {
    const res = await apiUploadOne(file);
    if (!!res && !!res.path) {
      this.toSave({ cover: res });
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
        <Form.Item {...formItemLayout} label="详情">
          {getFieldDecorator('desc', {
            initialValue: !selectedNode ? 0 : selectedNode['desc'],
            rules: [
              {
                required: true,
                message: '请填写详情',
              },
            ],
          })(<Input.TextArea rows={10} {...formItemStyle} placeholder="请填写详情" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="积分">
          {getFieldDecorator('points', {
            initialValue: !selectedNode ? 0 : selectedNode['points'],
            rules: [
              {
                required: true,
                message: '请填写积分',
              },
            ],
          })(<InputNumber min={0} {...formItemStyle} placeholder="请填写积分" />)}
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

  toSaveRichText = (notice) => {
    this.toSave({ notice });
  };

  toSaveAlbum = (album) => {
    this.toSave({ album });
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
            <Tabs.TabPane key="image" tab="封面">
              <ImageCropper
                url={!selectedNode.cover ? '' : selectedNode.coverPath}
                onUpload={this.onCoverUpload}
              />
            </Tabs.TabPane>
          ) : null}
          {selectedNode.id ? (
            <Tabs.TabPane key="album" tab="相册"><Album initialValue={selectedNode.album || []} onSave={this.toSaveAlbum} /></Tabs.TabPane>) : null
          }
          {selectedNode.id ? (
            <Tabs.TabPane key="richtext" tab="须知">
              <RichText
                onSave={this.toSaveRichText}
                html={selectedNode.notice}
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
