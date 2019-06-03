import React, { memo } from 'react';
import { Row, Col, Icon, Tooltip } from 'antd';
import styles from './Analysis.less';
import { ChartCard, MiniArea, MiniBar, MiniProgress, Field, Meter } from '@/components/Charts';
import Trend from '@/components/Trend';
import numeral from 'numeral';
import Yuan from '@/utils/Yuan';

const topColResponsiveProps = {
	xs: 24,
	sm: 12,
	md: 12,
	lg: 12,
	xl: 6,
	style: { marginBottom: 24 }
};

const SystemStatus = memo(({ loading, status }) => (
	<Row gutter={24}>
		<Col {...topColResponsiveProps}>
			<Meter name="CPU负载" data={status} />
		</Col>

		<Col {...topColResponsiveProps}>
			111
		</Col>
	</Row>
));

export default SystemStatus;
