import React, { Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import router from 'umi/router';
import {
  Tabs,
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Icon,
  DatePicker,
  Button,
  Skeleton,
  message,
} from 'antd';

import config from '@/config';
import { apiUploadOne } from '@/utils';

import ImageCropper from '@/components/ImageCropper';
import VideoEditor from '@/components/VideoEditor';

import BraftEditor from 'braft-editor';
import 'braft-editor/dist/index.css';

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
  state = {
    tabKey: 'basic',
  };

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
          thumbnail: res.path,
        },
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
          video: res.path,
        },
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

  toSaveRichText = () => {
    this.props.dispatch({
      type: `${MODEL_NAME}/save`,
      payload: {
        text: this.editorRef.getValue().toHTML(),
      },
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
        uploadFn: this.onEditorMediaUpload,
      },
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
                    nextCentury: 'Next century',
                  },
                }}
                placeholder="请选择发布日期时间"
              />
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

  render() {
    const { selectedNode, columns } = this.props;

    if (!selectedNode) return <Skeleton active loading />;

    const fields = columns.map((item) => item.dataIndex);

    return (
      <Fragment>
        <Button onClick={() => router.go(-1)}>
          <Icon type="arrow-left" />
          返回
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
