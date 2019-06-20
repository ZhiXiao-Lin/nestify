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
  DatePicker,
  Button,
  TreeSelect
} from 'antd';

import DetailPlus from '@/components/DetailPlus';

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const MODEL_NAME = 'contents';

@Form.create()
@connect(({ contents, category }) => ({
  category,
  selectedNode: contents.selectedNode,
  columns: contents.columns
}))
export default class extends React.Component {

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
      if ('CREATE' !== params.id) {
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

    const {
      dispatch
    } = this.props;

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

  renderBasicForm = () => {
    const {
      category,
      selectedNode,
      columns,
      form: { getFieldDecorator },
    } = this.props;

    const fields = columns.map((item) => item.dataIndex);

    return (
      <Form onSubmit={this.submitHandler} className="panel-form">
        {fields.includes('title') ? (
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
        ) : null}
        {fields.includes('publish_at') ? (
          <Form.Item {...formItemLayout} label="发布时间">
            {getFieldDecorator('publish_at', {
              initialValue: !selectedNode['publish_at'] ? null : moment(selectedNode['publish_at']),
              rules: [
                {
                  required: true,
                  message: '发布时间不能为空',
                },
              ],
            })(
              <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder="请选择发布日期时间" />
            )}
          </Form.Item>
        ) : null}
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
        {fields.includes('author') ? (
          <Form.Item {...formItemLayout} label="作者">
            {getFieldDecorator('author', {
              initialValue: !selectedNode ? null : selectedNode['author'],
            })(<Input {...formItemStyle} type="text" placeholder="请填写作者" />)}
          </Form.Item>
        ) : null}
        {fields.includes('source') ? (
          <Form.Item {...formItemLayout} label="来源">
            {getFieldDecorator('source', {
              initialValue: !selectedNode ? null : selectedNode['source'],
            })(<Input {...formItemStyle} type="text" placeholder="请填写来源" />)}
          </Form.Item>
        ) : null}
        {fields.includes('address') ? (
          <Form.Item {...formItemLayout} label="原文地址">
            {getFieldDecorator('address', {
              initialValue: !selectedNode ? null : selectedNode['address'],
            })(<Input {...formItemStyle} type="text" placeholder="请填写原文地址" />)}
          </Form.Item>
        ) : null}
        {fields.includes('sort') ? (
          <Form.Item {...formItemLayout} label="排序">
            {getFieldDecorator('sort', {
              initialValue: !selectedNode ? 0 : selectedNode['sort'],
            })(<InputNumber min={0} {...formItemStyle} placeholder="请填写排序" />)}
          </Form.Item>
        ) : null}
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

  toSave = (payload) => {
    this.props.dispatch({
      type: `${MODEL_NAME}/save`,
      payload
    });
  }

  render() {

    const { selectedNode } = this.props;

    let tabs = [{ key: 'basic', render: this.renderBasicForm }];

    if (!!selectedNode && !!selectedNode.id) {
      tabs = tabs.concat([{ key: 'image' },
      { key: 'video' },
      { key: 'text' },])
    }

    return (
      <Fragment>
        <Button onClick={() => router.go(-1)}>
          <Icon type="arrow-left" />
          返回
        </Button>
        <DetailPlus
          data={selectedNode}
          tabs={tabs}
          toSave={this.toSave}
        />
      </Fragment>
    );
  }
}
