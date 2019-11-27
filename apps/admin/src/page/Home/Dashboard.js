import React from 'react';
import { Col, Row } from 'antd';
import { addThousandSeparator } from 'util';
import SummaryCard from './SummaryCard';

const Dashboard = ({ loading, amount, pv, count, rate }) => (
  <Row gutter={16} type="flex" justify="space-around">
    <Col span={6} value={10}>
      <SummaryCard
        title="总销售额"
        intro="指标说明"
        loading={loading}
        total={`¥${addThousandSeparator(amount)}`}
      />
    </Col>
    <Col span={6} value={10}>
      <SummaryCard
        title="访问量"
        intro="指标说明"
        loading={loading}
        total={addThousandSeparator(pv)}
      />
    </Col>
    <Col span={6} value={10}>
      <SummaryCard
        title="支付笔数"
        intro="指标说明"
        loading={loading}
        total={addThousandSeparator(count)}
      />
    </Col>
    <Col span={6} value={10}>
      <SummaryCard
        title="运营活动效果"
        intro="指标说明"
        loading={loading}
        total={`${addThousandSeparator(rate)}%`}
      />
    </Col>
  </Row>
);

export default Dashboard;
