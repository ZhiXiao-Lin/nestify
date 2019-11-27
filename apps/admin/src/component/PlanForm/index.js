import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import { Input, Form, Select, Radio, Icon, Modal } from 'antd';
import OSSUpload from 'component/OSSUpload';

const { Option } = Select;
const RadioGroup = Radio.Group;
const FormItem = Form.Item;

class PlanForm extends Component {
  static defaultProps = {
    enabledFields: []
  }

  static displayName = 'ExchangeForm';

  beforeUpload = (file) => {
    const image = file.type.indexOf('image') > -1;
    if (!image) {
      Modal.error({
        content: '只能上传图片文件'
      });
      return false;
    }

    const empty = file.size <= 0;
    if (empty) {
      Modal.error({
        content: '不能上传空文件'
      });
      return false;
    }

    const limit = file.size / 1024 / 1024 < 10;
    if (!limit) {
      Modal.error({
        content: '文件大小不能超过10M'
      });
      return false;
    }

    return true;
  }

  checkInputLength(field, maxLength, rule, value, callback) {
    if (value && value.toString().length > maxLength) {
      callback(`不能超过${maxLength}个字符`);

      // 不能在这里setFieldsValue，否则错误提示会被清空
      // let obj = {};
      // obj[field] = value.substr(0, maxLength);
      // this.props.form.setFieldsValue(obj);
    } else {
      callback();
    }
  }

  renderName(formItemLayout, disabled) {
    const { enabledFields, mode, name } = this.props;
    const { getFieldDecorator } = this.props.form;

    return (
      <FormItem
        label="名称"
        // colon={false}
        {...formItemLayout}
      >
        {
          mode === 'view'
            ? <span>{name.value}</span>
            : (
              getFieldDecorator('name', {
                initialValue: '',
                validateTrigger: ['onChange'],
                rules: [
                  { required: true, message: '请输入名称' },
                  { pattern: '^[a-zA-Z0-9_\\u4e00-\\u9fa5_\\\\-]+$', message: '仅支持中英文、数字和下划线' },
                  { validator: (rule, value, callback) => this.checkInputLength('name', 40, rule, value, callback) }
                ]
              })(
                <Input
                  className="field long"
                  disabled={enabledFields.indexOf('name') < 0 && disabled}
                  placeholder="请输入"
                />
              )
            )
        }
      </FormItem>
    );
  }

  renderDescription(formItemLayout, disabled) {
    const { enabledFields, mode, description } = this.props;
    const { getFieldDecorator } = this.props.form;

    return (
      <FormItem
        label="描述"
        // colon={false}
        {...formItemLayout}
      >
        {
          mode === 'view'
            ? <span>{description.value}</span>
            : (
              getFieldDecorator('description', {
                initialValue: '',
                validateTrigger: ['onChange'],
                rules: [
                  { required: true, message: '请输入描述' },
                  { pattern: '^[a-zA-Z0-9_\\u4e00-\\u9fa5_\\\\-]+$', message: '仅支持中英文、数字和下划线' },
                  { validator: (rule, value, callback) => this.checkInputLength('name', 40, rule, value, callback) }
                ]
              })(
                <Input
                  className="field long"
                  disabled={enabledFields.indexOf('description') < 0 && disabled}
                  placeholder="请输入"
                />
              )
            )
        }
      </FormItem>
    );
  }

  renderType(formItemLayout, disabled) {
    const { form, mode, type, types } = this.props;
    const { getFieldDecorator } = form;

    const typeNodes = types.map(item => (<Radio key={item.id} value={item.id}>{item.name}</Radio>));

    return (
      <FormItem
        className=""
        label="类型"
        // colon={false}
        {...formItemLayout}
      >
        {
          mode === 'view'
            ? (
              <span>{type.value === 0 ? '类型1' : '类型2'}</span>
            )
            : (
              getFieldDecorator('type', {
                initialValue: '',
                rules: [
                  { required: true, message: '请选择类型' }
                ]
              })(
                <RadioGroup disabled={disabled}>
                  {typeNodes}
                </RadioGroup>
              )
            )
        }
      </FormItem>
    );
  }

  renderSubType(formItemLayout, disabled) {
    const { subTypes, mode, subType } = this.props;
    const { getFieldDecorator } = this.props.form;

    const subTypeOptions = subTypes.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>);

    return (
      <FormItem
        {...formItemLayout}
        label="子类型"
      >
        {
          mode === 'view'
            ? (
              <span>{subType.value}</span>
            )
            : (
              getFieldDecorator('subType', {
                rules: [
                  { required: true, message: '请选择子类型' }
                ]
              })(
                <Select
                  className="field"
                  placeholder="请选择子类型"
                  showSearch
                  disabled={disabled}
                  filterOption={(input, option) =>
                    option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {subTypeOptions}
                </Select>
              )
            )
        }
      </FormItem>
    );
  }

  renderLogoUpload(formItemLayout, disabled) {
    const { mode } = this.props;
    const { getFieldDecorator } = this.props.form;

    return (
      <FormItem
        {...formItemLayout}
        label="logo"
        extra=""
      >
        {
          getFieldDecorator('logo', {
            rules: [
              { required: true, message: '图片未上传' }
            ]
          })(
            <OSSUpload
              listType="picture-card"
              desc={mode === 'view' ? '' : 'png格式 200*200'}
              disabled={disabled}
              beforeUpload={this.beforeUpload}
            >
              {
                mode === 'view'
                  ? null
                  : (
                    <div>
                      <Icon type="plus" style={{ fontSize: 24 }} />
                      <div className="ant-upload-text">上传图片</div>
                    </div>
                  )
              }
            </OSSUpload>
          )}
      </FormItem>
    );
  }

  renderImageUpload(formItemLayout, disabled) {
    const { mode } = this.props;
    const { getFieldDecorator } = this.props.form;

    return (
      <FormItem
        {...formItemLayout}
        label="图像"
        extra=""
      >
        {
          getFieldDecorator('image', {
            rules: [
              { required: true, message: '图片未上传' }
            ]
          })(
            <OSSUpload
              listType="picture-card"
              desc={mode === 'view' ? '' : 'png格式 200*200'}
              disabled={disabled}
              beforeUpload={this.beforeUpload}
            >
              {
                mode === 'view'
                  ? null
                  : (
                    <div>
                      <Icon type="plus" style={{ fontSize: 24 }} />
                      <div className="ant-upload-text">上传图片</div>
                    </div>
                  )
              }
            </OSSUpload>
          )}
      </FormItem>
    );
  }

  render() {
    const { disabled } = this.props;
    const formItemLayout = { labelCol: { span: 6 }, wrapperCol: { span: 14 } };

    return (
      <Form onSubmit={this.handleSubmit}>
        { this.renderName(formItemLayout, disabled) }
        { this.renderDescription(formItemLayout, disabled) }
        { this.renderType(formItemLayout, disabled) }
        { this.renderSubType(formItemLayout, disabled) }
        { this.renderLogoUpload(formItemLayout, disabled) }
        { this.renderImageUpload(formItemLayout, disabled) }
      </Form>
    );
  }
}

export default Form.create({
  onFieldsChange(props, changedFields) {
    props.onChange(changedFields);
  },

  mapPropsToFields(props) {
    return {
      name: Form.createFormField({
        ...props.name,
        value: props.name.value
      }),
      description: Form.createFormField({
        ...props.description,
        value: props.description.value
      }),
      type: Form.createFormField({
        ...props.type,
        value: props.type.value
      }),
      subType: Form.createFormField({
        ...props.subType,
        value: props.subType.value
      }),
      logo: Form.createFormField({
        ...props.logo,
        value: props.logo.value
      }),
      image: Form.createFormField({
        ...props.image,
        value: props.image.value
      })
    };
  }
})(PlanForm);
