import React, { Fragment } from 'react';
import _ from 'lodash';
import UUIDV4 from 'uuid/v4';
import moment from 'moment';
import { connect } from 'dva';
import { Tabs, Form, Input, Row, Col, Popconfirm, Button, Skeleton } from 'antd';

import config from '@/config';
import { apiUploadOneToQiniu } from '@/utils';

import DetailPlus from '@/components/DetailPlus';
import ImageCropper from '@/components/ImageCropper';
import EditableTable from '@/components/EditableTable';

const formItemStyle = { style: { width: '80%', marginRight: 8 } };
const formItemLayout = {
  labelCol: { xs: { span: 24 }, sm: { span: 8 } },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 } },
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 8 } },
};

const MODEL_NAME = 'setting';

@Form.create()
@connect(({ setting }) => ({
  selectedNode: setting.selectedNode,
}))
export default class extends React.Component {
  state = {
    tabKey: 'basic',
  };

  componentDidMount() {
    this.loadData();
  }

  loadData = () => {
    const { dispatch } = this.props;

    dispatch({
      type: `${MODEL_NAME}/detail`,
      payload: {},
    });
  };

  onTabChange = (tabKey) => {
    this.setState({ tabKey });
  };

  onWechatUpload = async (file) => {
    const { dispatch } = this.props;

    const res = await apiUploadOneToQiniu(file);

    if (!!res && !!res.path) {
      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: {
          ex_info: {
            setting: {
              wechat: res,
            },
          },
        },
      });
    }
  };

  onWeiboUpload = async (file) => {
    const { dispatch } = this.props;

    const res = await apiUploadOneToQiniu(file);

    if (!!res && !!res.path) {
      dispatch({
        type: `${MODEL_NAME}/save`,
        payload: {
          ex_info: {
            setting: {
              weibo: res,
            },
          },
        },
      });
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
      form: { getFieldDecorator },
    } = this.props;
    return (
      <Form onSubmit={this.submitHandler} className="panel-form">
        <Form.Item {...formItemLayout} label="网站标题">
          {getFieldDecorator('ex_info.setting.title', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['title'],
            rules: [
              {
                required: true,
                message: '网站标题不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写网站标题" />)}
        </Form.Item>

        <Form.Item {...formItemLayout} label="ICP备案号">
          {getFieldDecorator('ex_info.setting.icp', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['icp'],
            rules: [
              {
                required: true,
                message: 'ICP备案号不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写ICP备案号" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="公网安备号">
          {getFieldDecorator('ex_info.setting.pns', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['pns'],
            rules: [
              {
                required: true,
                message: '公网安备号不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写公网安备号" />)}
        </Form.Item>

        <Form.Item {...formItemLayout} label="网站描述">
          {getFieldDecorator('ex_info.setting.recommendation', {
            initialValue: !selectedNode
              ? null
              : selectedNode['ex_info']['setting']['recommendation'],
            rules: [
              {
                required: true,
                message: '网站描述不能为空',
              },
            ],
          })(
            <Input.TextArea rows={5} {...formItemStyle} type="text" placeholder="请填写网站描述" />
          )}
        </Form.Item>
        <Form.Item {...formItemLayout} label="版权信息">
          {getFieldDecorator('ex_info.setting.copyright', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['copyright'],
            rules: [
              {
                required: true,
                message: '版权信息不能为空',
              },
            ],
          })(
            <Input.TextArea rows={5} {...formItemStyle} type="text" placeholder="请填写版权信息" />
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
  renderDetailForm = () => {
    const {
      selectedNode,
      form: { getFieldDecorator },
    } = this.props;
    return (
      <Form onSubmit={this.submitHandler} className="panel-form">
        <Form.Item {...formItemLayout} label="游玩时间">
          {getFieldDecorator('ex_info.setting.openInfo', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['openInfo'],
            rules: [
              {
                required: true,
                message: '游玩时间不能为空',
              },
            ],
          })(
            <Input.TextArea rows={5} {...formItemStyle} type="text" placeholder="请填写游玩时间" />
          )}
        </Form.Item>
        <Form.Item {...formItemLayout} label="在线预定地址">
          {getFieldDecorator('ex_info.setting.onlineSaleUrl', {
            initialValue: !selectedNode
              ? null
              : selectedNode['ex_info']['setting']['onlineSaleUrl'],
            rules: [
              {
                required: true,
                message: '在线预定地址不能为空',
              },
            ],
          })(
            <Input.TextArea
              rows={5}
              {...formItemStyle}
              type="text"
              placeholder="请填写在线预定地址"
            />
          )}
        </Form.Item>
        <Form.Item {...formItemLayout} label="服务热线">
          {getFieldDecorator('ex_info.setting.serviceHotline', {
            initialValue: !selectedNode
              ? null
              : selectedNode['ex_info']['setting']['serviceHotline'],
            rules: [
              {
                required: true,
                message: '服务热线不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写服务热线" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="售票热线">
          {getFieldDecorator('ex_info.setting.bookingHotline', {
            initialValue: !selectedNode
              ? null
              : selectedNode['ex_info']['setting']['bookingHotline'],
            rules: [
              {
                required: true,
                message: '售票热线不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写售票热线" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="商务合作热线">
          {getFieldDecorator('ex_info.setting.cooperationHotline', {
            initialValue: !selectedNode
              ? null
              : selectedNode['ex_info']['setting']['cooperationHotline'],
            rules: [
              {
                required: true,
                message: '商务合作热线不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写商务合作热线" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="景区办公热线">
          {getFieldDecorator('ex_info.setting.officeTel', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['officeTel'],
            rules: [
              {
                required: true,
                message: '景区办公热线不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写景区办公热线" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="邮政编码">
          {getFieldDecorator('ex_info.setting.postcode', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['postcode'],
            rules: [
              {
                required: true,
                message: '邮政编码不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写邮政编码" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="传真号码">
          {getFieldDecorator('ex_info.setting.fax', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['fax'],
            rules: [
              {
                required: true,
                message: '传真号码不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写传真号码" />)}
        </Form.Item>

        <Form.Item {...formItemLayout} label="景区地址">
          {getFieldDecorator('ex_info.setting.address', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['address'],
            rules: [
              {
                required: true,
                message: '景区地址不能为空',
              },
            ],
          })(
            <Input.TextArea rows={5} {...formItemStyle} type="text" placeholder="请填写景区地址" />
          )}
        </Form.Item>
        <Form.Item {...formItemLayout} label="乘车路线">
          {getFieldDecorator('ex_info.setting.busLine', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['setting']['busLine'],
            rules: [
              {
                required: true,
                message: '乘车路线不能为空',
              },
            ],
          })(
            <Input.TextArea rows={5} {...formItemStyle} type="text" placeholder="请填写乘车路线" />
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
  renderSEOForm = () => {
    const {
      selectedNode,
      form: { getFieldDecorator },
    } = this.props;
    return (
      <Form onSubmit={this.submitHandler} className="panel-form">
        <Form.Item {...formItemLayout} label="标题">
          {getFieldDecorator('ex_info.seo.title', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['seo']['title'],
            rules: [
              {
                required: true,
                message: '标题不能为空',
              },
            ],
          })(<Input {...formItemStyle} type="text" placeholder="请填写标题" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="关键词">
          {getFieldDecorator('ex_info.seo.keywords', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['seo']['keywords'],
            rules: [
              {
                required: true,
                message: '关键词不能为空',
              },
            ],
          })(<Input.TextArea rows={3} {...formItemStyle} type="text" placeholder="请填写关键词" />)}
        </Form.Item>
        <Form.Item {...formItemLayout} label="描述">
          {getFieldDecorator('ex_info.seo.description', {
            initialValue: !selectedNode ? null : selectedNode['ex_info']['seo']['description'],
            rules: [
              {
                required: true,
                message: '描述不能为空',
              },
            ],
          })(<Input.TextArea rows={3} {...formItemStyle} type="text" placeholder="请填写描述" />)}
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

  handleAdd = () => {
    const { selectedNode, dispatch } = this.props;

    selectedNode.ex_info.links.push({
      id: UUIDV4(),
      title: '标题',
      url: 'http://',
      sort: 0,
    });

    dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        selectedNode,
      },
    });
  };

  handleDelete = (row) => {
    const { selectedNode, dispatch } = this.props;

    selectedNode.ex_info.links = selectedNode.ex_info.links.filter(item => item.id !== row.id);

    dispatch({
      type: `${MODEL_NAME}/set`,
      payload: {
        selectedNode
      },
    });
  };

  handleSave = (row, values) => {
    const { selectedNode, dispatch } = this.props;

    if (!!row) {
      selectedNode.ex_info.links = selectedNode.ex_info.links.map(item => {
        if (item.id === row.id) {
          return _.merge(item, values);
        }
        return item;
      });
    }

    dispatch({
      type: `${MODEL_NAME}/save`,
      payload: {
        selectedNode
      }
    });
  };

  toSave = (payload) => {
    this.props.dispatch({
      type: `${MODEL_NAME}/save`,
      payload
    });
  }

  render() {
    const { selectedNode } = this.props;

    if (!selectedNode) return <Skeleton active loading />;

    return (
      <Fragment>
        <DetailPlus
          data={selectedNode}
          tabs={[
            { key: 'basic', name: '基础设置', render: this.renderBasicForm },
            { key: 'detail', name: '详细设置', render: this.renderDetailForm },
            { key: 'seo', name: 'SEO设置', render: this.renderSEOForm },
            {
              key: 'image', tabKey: 'wecahtQRCode', name: '微信二维码', options: {
                width: 200,
                height: 200
              },
              renderValue: (data) => data.wechatImg,
              saveValue: async (file) => {
                const res = await apiUploadOneToQiniu(file);

                if (!!res && !!res.path) {
                  this.toSave({
                    ex_info: {
                      setting: {
                        wechat: res,
                      },
                    }
                  })
                }
              }
            },
            {
              key: 'image', tabKey: 'weiboQRCode', name: '微博二维码', options: {
                width: 200,
                height: 200
              },
              renderValue: (data) => data.weiboImg,
              saveValue: async (file) => {
                const res = await apiUploadOneToQiniu(file);

                if (!!res && !!res.path) {
                  this.toSave({
                    ex_info: {
                      setting: {
                        weibo: res,
                      },
                    }
                  })
                }
              }
            },
            {
              key: 'editableTable', name: '友情链接', options: {
                columns: [
                  {
                    title: '标题',
                    key: 'id',
                    dataIndex: 'title',
                    editable: true,
                  },
                  {
                    title: '地址',
                    dataIndex: 'url',
                    editable: true,
                  },
                  {
                    title: '排序',
                    dataIndex: 'sort',
                    editable: true,
                  },
                  {
                    title: '操作',
                    dataIndex: 'title',
                    render: (val, row) => (
                      <Popconfirm
                        title="确定要删除吗?"
                        okText="确定"
                        cancelText="取消"
                        onConfirm={() => this.handleDelete(row)}
                      >
                        <a href="javascript:;">删除</a>
                      </Popconfirm>
                    ),
                  }
                ],
                handleAdd: this.handleAdd,
                handleSave: this.handleSave,
              }
            }
          ]}
          toSave={this.toSave}
        />
      </Fragment>
    );
  }
}
