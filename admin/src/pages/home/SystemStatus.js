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

const SystemStatus = memo(({ loading, visitData }) => (
	<Row gutter={24}>
		<Col {...topColResponsiveProps}>
			<Meter name="CPU负载" />
		</Col>

		<Col {...topColResponsiveProps}>
			<ChartCard
				bordered={false}
				loading={loading}
				title={'内存'}
				action={
					<Tooltip title={'服务器内存使用量'}>
						<Icon type="info-circle-o" />
					</Tooltip>
				}
				total={numeral(8846).format('0,0')}
				footer={<Field label={'日访问量'} value={numeral(1234).format('0,0')} />}
				contentHeight={46}
			>
				<MiniArea color="#975FE4" data={visitData} />
			</ChartCard>
		</Col>
	</Row>
));

export default SystemStatus;
