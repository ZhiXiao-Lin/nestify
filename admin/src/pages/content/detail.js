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
@connect(({ contents }) => ({
  selectedNode: contents.selectedNode,
  columns: contents.columns,
}))
export default class extends React.Component {

  componentDidMount() {
    const {
      match: { params },
    } = this.props;

    this.init(params.channel);
    this.loadData();
  }

  componentWillReceiveProps(nextProps) {
    const {
      match: { params },
    } = nextProps;
    if (this.props.match.params.id !== params.id) {
      this.init(params.channel);
      this.loadData(params.id);
    }
  }

  init = (channel) => {
    let columns = [];
    let fields = [];
    let showQueryCondition = false;

    switch (channel) {
      case '联系方式':
        columns = [
          {
            title: '详情',
            dataIndex: 'id',
          },
          {
            title: '公司名称',
            dataIndex: 'ex_info.company',
          },
          {
            title: '电话',
            dataIndex: 'ex_info.phone',
          },
          {
            title: '传真',
            dataIndex: 'ex_info.fax',
          },
          {
            title: '销售',
            dataIndex: 'ex_info.sale',
          },
          {
            title: '地址',
            dataIndex: 'ex_info.address',
          },
          {
            title: '邮编',
            dataIndex: 'ex_info.postcode',
          },
        ];
        fields = [
          'id',
          'ex_info.company',
          'ex_info.phone',
          'ex_info.fax',
          'ex_info.sale',
          'ex_info.address',
          'ex_info.postcode',
        ];
        break;
      case '留言咨询':
        columns = [
          {
            title: '详情',
            dataIndex: 'id',
          },
          {
            title: '问题',
            dataIndex: 'ex_info.question',
          },
          {
            title: '回复',
            dataIndex: 'ex_info.reply',
          },
          {
            title: '回复时间',
            dataIndex: 'update_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
          {
            title: '留言时间',
            dataIndex: 'create_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
        ];
        fields = ['id', 'ex_info.question', 'ex_info.reply', 'update_at', 'create_at'];
        break;
      case '投诉建议':
        columns = [
          {
            title: '详情',
            dataIndex: 'id',
          },
          {
            title: '昵称',
            dataIndex: 'ex_info.nickname',
          },
          {
            title: '标题',
            dataIndex: 'ex_info.title',
          },
          {
            title: '内容',
            dataIndex: 'ex_info.content',
          },
          {
            title: '电话',
            dataIndex: 'ex_info.phone',
          },
          {
            title: '提交时间',
            dataIndex: 'create_at',
            sorter: true,
            render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
          },
        ];
        fields = [
          'id',
          'ex_info.nickname',
          'ex_info.title',
          'ex_info.content',
          'ex_info.phone',
          'create_at',
        ];
        break;
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
            render: (val) => '略',
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
  };

  resetHandler = () => {
    this.props.form.resetFields();
  };

  submitHandler = (e) => {
    e.preventDefault();

    const {
      dispatch,
      match: { params },
    } = this.props;

    this.props.form.validateFields((err, values) => {
      if (!!err || Object.keys(values).length === 0) {
        return;
      }

      values['publish_at'] = moment(values['publish_at']).format('YYYY-MM-DD HH:mm:ss');
      values['category'] = params.channel;

      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: values,
      });
    });
  };

  renderBasicForm = () => {
    const {
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
          <Form.Item {...formItemLayout} label="地址">
            {getFieldDecorator('address', {
              initialValue: !selectedNode ? null : selectedNode['address'],
            })(<Input {...formItemStyle} type="text" placeholder="请填写地址" />)}
          </Form.Item>
        ) : null}
        {fields.includes('sort') ? (
          <Form.Item {...formItemLayout} label="排序">
            {getFieldDecorator('sort', {
              initialValue: !selectedNode ? 0 : selectedNode['sort'],
            })(<InputNumber min={0} {...formItemStyle} placeholder="请填写排序" />)}
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
        {fields.includes('ex_info.company') ? (
          <Form.Item {...formItemLayout} label="公司名称">
            {getFieldDecorator('ex_info.company', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['company']
                  : '',
            })(<Input {...formItemStyle} type="text" placeholder="公司名称" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.nickname') ? (
          <Form.Item {...formItemLayout} label="昵称">
            {getFieldDecorator('ex_info.nickname', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['nickname']
                  : '',
            })(<Input {...formItemStyle} type="text" placeholder="昵称" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.title') ? (
          <Form.Item {...formItemLayout} label="标题">
            {getFieldDecorator('ex_info.title', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['title']
                  : '',
            })(<Input {...formItemStyle} type="text" placeholder="标题" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.content') ? (
          <Form.Item {...formItemLayout} label="内容">
            {getFieldDecorator('ex_info.content', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['content']
                  : '',
            })(<Input.TextArea rows={5} {...formItemStyle} type="text" placeholder="内容" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.phone') ? (
          <Form.Item {...formItemLayout} label="电话">
            {getFieldDecorator('ex_info.phone', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['phone']
                  : '',
            })(<Input {...formItemStyle} type="text" placeholder="电话" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.fax') ? (
          <Form.Item {...formItemLayout} label="传真">
            {getFieldDecorator('ex_info.fax', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['fax']
                  : '',
            })(<Input {...formItemStyle} type="text" placeholder="传真" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.sale') ? (
          <Form.Item {...formItemLayout} label="销售">
            {getFieldDecorator('ex_info.sale', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['sale']
                  : '',
            })(<Input {...formItemStyle} type="text" placeholder="销售" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.address') ? (
          <Form.Item {...formItemLayout} label="地址">
            {getFieldDecorator('ex_info.address', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['address']
                  : '',
            })(<Input {...formItemStyle} type="text" placeholder="地址" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.postcode') ? (
          <Form.Item {...formItemLayout} label="邮编">
            {getFieldDecorator('ex_info.postcode', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['postcode']
                  : '',
            })(<Input {...formItemStyle} type="text" placeholder="邮编" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.question') ? (
          <Form.Item {...formItemLayout} label="问题">
            {getFieldDecorator('ex_info.question', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['question']
                  : '',
            })(<Input.TextArea rows={5} {...formItemStyle} type="text" placeholder="问题" />)}
          </Form.Item>
        ) : null}
        {fields.includes('ex_info.reply') ? (
          <Form.Item {...formItemLayout} label="回复">
            {getFieldDecorator('ex_info.reply', {
              initialValue: !selectedNode
                ? null
                : selectedNode['ex_info']
                  ? selectedNode['ex_info']['reply']
                  : '',
            })(<Input.TextArea rows={5} {...formItemStyle} type="text" placeholder="回复" />)}
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
