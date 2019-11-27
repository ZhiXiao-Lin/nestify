import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import cssModules from 'react-css-modules';
import { Card, Button, Divider, Spin } from 'antd';
import Form from 'component/PlanForm';
import styles from './style.less';

@inject('basicFormStore')
@observer
@cssModules(styles)
class BasicForm extends Component {
  state = {
    // value: 1
  }

  constructor(props) {
    super(props);

    this.store = this.props.basicFormStore;
  }


  async componentWillMount() {
    const { location, match, history } = this.props;

    await this.store.onWillMount(location, match, history);

    window.dplus.track('page_load', {
      name: '基础表单页',
      url: this.props.location.pathname
    });
  }

  handleSubmit = () => {
    const { submit } = this.store;
    const { form } = this.exchangeForm.props;

    form.validateFields((err, values) => {
      if (!err) {
        submit(values);
      }
    });
  }

  render() {
    // const { exchagneCreateStore: store } = this.props;
    const { loading, adLoading, fields, types, subTypes, onFormChange } = this.store;

    return (
      <div>
        <Spin spinning={loading}>
          <Card>
            <Form
              wrappedComponentRef={f => (this.exchangeForm = f)}
              adLoading={adLoading}
              mode="edit"
              {...fields}
              types={types}
              subTypes={subTypes}
              onChange={onFormChange}
            />
            <div styleName="actions">
              <Button styleName="btn-next" type="primary" onClick={this.handleSubmit}>提交</Button>
            </div>
            <Divider />
            <Card bordered={false}>
              <p>说明</p>
              <p>名称说明</p>
              <p>描述</p>
              <p>如果需要，这里可以放一些关于产品的常见问题说明。</p>
            </Card>
          </Card>
        </Spin>
      </div>
    );
  }
}

export default BasicForm;
