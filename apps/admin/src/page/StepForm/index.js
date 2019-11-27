import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import cssModules from 'react-css-modules';
import { Card, Steps, Button, Divider, Spin } from 'antd';
import Success from 'page/Result/Success';
import Form from 'component/PlanForm';
import styles from './style.less';

const { Step } = Steps;

@inject('stepFormStore')
@observer
@cssModules(styles)
class StepForm extends Component {
  state = {
    // value: 1
  }

  constructor(props) {
    super(props);

    this.store = this.props.stepFormStore;
  }


  async componentWillMount() {
    const { location, match, history } = this.props;

    await this.store.onWillMount(location, match, history);

    window.dplus.track('page_load', {
      name: '分步表单页',
      url: this.props.location.pathname
    });
  }

  handleNext = () => {
    const { next } = this.store;
    const { form } = this.exchangeForm.props;

    form.validateFields((err, values) => {
      if (!err) {
        next(values);
      }
    });
  }

  render() {
    // const { exchagneCreateStore: store } = this.props;
    const { loading, adLoading, step, fields, types, subTypes, onFormChange, prev, submit } = this.store;

    return (
      <div>
        <Spin spinning={loading}>
          <Card>
            <Steps current={step}>
              <Step title="填写计划信息" description="" />
              <Step title="确认" description="" />
              <Step title="结果" description="" />
            </Steps>
            <Card bordered={false}>
              <div
                style={{
                  display: step === 0 || step === 1 ? 'block' : 'none'
                }}
              >
                <Form
                  wrappedComponentRef={f => (this.exchangeForm = f)}
                  adLoading={adLoading}
                  mode={step === 0 ? 'edit' : 'view'}
                  {...fields}
                  types={types}
                  subTypes={subTypes}
                  onChange={onFormChange}
                />
              </div>
              { step === 2 && <Success /> }
              <div styleName="actions">
                { step === 0 && <Button styleName="btn-next" type="primary" onClick={this.handleNext}>下一步</Button> }
                {
                  step === 1 && (
                    <React.Fragment>
                      <Button type="default" onClick={prev}>返回</Button>
                      <Button styleName="btn-next" type="primary" onClick={submit}>提交</Button>
                    </React.Fragment>
                  )
                }
              </div>
              { step !== 2 && <Divider /> }
              {
                step !== 2 && (
                  <Card bordered={false}>
                    <p>说明</p>
                    <p>名称说明</p>
                    <p>描述</p>
                    <p>如果需要，这里可以放一些关于产品的常见问题说明。</p>
                  </Card>
                )
              }
            </Card>
          </Card>
        </Spin>
      </div>
    );
  }
}

export default StepForm;
