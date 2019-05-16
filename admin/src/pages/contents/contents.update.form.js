import React from 'react';
import { Form, Input, Select, Cascader, Switch, Button, message } from 'antd';

const formItemLayout = { 
  labelCol  : { xs: { span: 24 }, sm: { span: 8 }, },
  wrapperCol: { xs: { span: 24 }, sm: { span: 16 },},
};
const formItemStyle = {
  style: {width: '80%', marginRight: 8}
};
const tailFormItemLayout = {
  wrapperCol: { xs: { span: 24, offset: 0, }, sm: { span: 16, offset: 8, }, },
};

const gFieldRequired = {
    'title': true,
    'author': true,
    'type' : true,
}

@Form.create()
export default class ContentsUpdateForm extends React.Component {
  state = {
    isFieldRequired: Object.assign({}, gFieldRequired)
  }
  onItemEnableChange = (name) => (enable) => {
    const { isFieldRequired } = this.state;
    isFieldRequired[name] = enable;
    this.setState({
      isFieldRequired: {...isFieldRequired}
    });
  }

  submitHandler = (e) => {
    e.preventDefault();
    const { onSubmit, form: { validateFields } } = this.props;
    const { isFieldRequired } = this.state;

    const validateFieldsNameList = Object.keys(isFieldRequired).filter(name => isFieldRequired[name]);

    validateFields(validateFieldsNameList, (err, values) => {
      if (!!err) return;
      if (Object.keys(values).length === 0) {
        message.error('没有数据需要更新！');
        return;
      }
      // else
      if (!!onSubmit) onSubmit(values);
    });
  }
  cancelHandler = () => {
    const { onCancel } = this.props;
    this.props.form.resetFields();
    if (!!onCancel) onCancel();
  }
  render() {
    const { roles, employers, form: { getFieldDecorator } } = this.props;
    const { isFieldRequired } = this.state;

    return(
      <Form onSubmit={this.submitHandler} >
        <Form.Item {...formItemLayout} label="题目" >
          {getFieldDecorator("title", {
            initialValue: null,
            rules: [{ required: true, message: "不能为空" }],
          })(
            <Input {...formItemStyle} type="text" disabled={!isFieldRequired['title']} placeholder="请输入标题" />
          )}
          <Switch size="small" checked={isFieldRequired['title']} onChange={this.onItemEnableChange('title')} />
        </Form.Item>
        <Form.Item {...formItemLayout} label="作者" >
          {getFieldDecorator("author", {
            initialValue: null,
            rules: [{ required: true, message: "不能为空" }],
          })(
            <Input {...formItemStyle} type="text" disabled={!isFieldRequired['author']} placeholder="请输入作者" />
          )}
          <Switch size="small" checked={isFieldRequired['author']} onChange={this.onItemEnableChange('author')} />
        </Form.Item>
        <Form.Item {...formItemLayout} label="分类" >
          {getFieldDecorator("type", {
            initialValue: null,
            rules: [{ required: true, message: "不能为空" }],
          })(
            <Input {...formItemStyle} type="text" disabled={!isFieldRequired['type']} placeholder="请输入分类" />
          )}
          <Switch size="small" checked={isFieldRequired['type']} onChange={this.onItemEnableChange('type')} />
        </Form.Item>
        <Form.Item {...tailFormItemLayout} >
          <Button onClick={ this.cancelHandler }>取消</Button>
          <Button type='primary' htmlType="submit" >更新</Button>
        </Form.Item>
      </Form>
    )
  }
}
