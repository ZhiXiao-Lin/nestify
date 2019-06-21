import _ from 'lodash';
import React, { memo } from 'react';
import { Row, Col } from 'antd';
import { Meter, Area } from '@/components/Charts';

const topColResponsiveProps = {
  xs: 24,
  sm: 12,
  md: 12,
  lg: 12,
  xl: 12,
  style: { marginBottom: 24 },
};

const SystemStatus = memo(({ loading, status }) => (
  <Row gutter={24}>
    <Col {...topColResponsiveProps}>
      <Meter name="CPU负载" data={status[0]} />
    </Col>

    <Col {...topColResponsiveProps}>
      <Area name="内存用量" data={status || []} />
    </Col>
  </Row>
));

export default SystemStatus;
