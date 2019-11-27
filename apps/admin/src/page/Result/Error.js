import React, { Fragment } from 'react';
import { Button, Icon, Card } from 'antd';
import { Result } from 'ant-design-pro';

const extra = (
  <Fragment>
    <div
      style={{
        fontSize: 16,
        color: 'rgba(0, 0, 0, 0.85)',
        fontWeight: '500',
        marginBottom: 16
      }}
    >
      <span>您提交的内容有如下错误：</span>
    </div>
    <div style={{ marginBottom: 16 }}>
      <Icon style={{ color: '#f5222d', marginRight: 8 }} type="close-circle-o" />
      <span>您的账户已被冻</span>
      <a style={{ marginLeft: 16 }}>
        <span>立即解冻</span>
        <Icon type="right" />
      </a>
    </div>
    <div>
      <Icon style={{ color: '#f5222d', marginRight: 8 }} type="close-circle-o" />
      <span>您的账户还不具备申请资格</span>
      <a style={{ marginLeft: 16 }}>
        <span>立即升级</span>
        <Icon type="right" />
      </a>
    </div>
  </Fragment>
);

const actions = (
  <Button type="primary">
    返回修改
  </Button>
);

export default () => (
  <Card
    bordered={false}
    style={{
      marginTop: 24,
      marginRight: 24,
      marginBottom: 0,
      marginLeft: 24
    }}
  >
    <Result
      type="error"
      title="提交失败"
      description="请核对并修改以下信息后，再重新提交。"
      extra={extra}
      actions={actions}
      style={{ marginTop: 48, marginBottom: 16 }}
    />
  </Card>
);
