import React from 'react';
import { Form, Icon, Input, Button } from 'antd';

const FormItem = Form.Item;

class FilterForm extends React.Component {
  componentDidMount() {
    // To disabled submit button at the beginning.
    // this.props.form.validateFields();
  }

  handleSubmit = (e) => {
    const { onSubmit } = this.props;
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        console.log('Received values of form: ', values);

        typeof onSubmit === 'function' && onSubmit(values);
      }
    });
  }

  render() {
    const { getFieldDecorator } = this.props.form;

    return (
      <Form
        style={{ marginLeft: 0 }}
        layout="inline"
        onSubmit={this.handleSubmit}
      >
        <FormItem>
          {getFieldDecorator('name', {
            rules: [
              // { required: true, message: 'Please input your name!' }
            ]
          })(
            <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="计划名称" />
          )}
        </FormItem>
        <FormItem>
          <Button
            type="primary"
            htmlType="submit"
          >
            查询
          </Button>
        </FormItem>
      </Form>
    );
  }
}

export default Form.create()(FilterForm);
