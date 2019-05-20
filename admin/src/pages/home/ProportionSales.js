import React, { memo } from 'react';
import { Card, Radio } from 'antd';
import styles from './Analysis.less';
import { Pie } from '@/components/Charts';
import Yuan from '@/utils/Yuan';

const ProportionSales = memo(({ dropdownGroup, salesType, loading, salesPieData, handleChangeSalesType }) => (
	<Card
		loading={loading}
		className={styles.salesCard}
		bordered={false}
		title={'线上热门搜索'}
		bodyStyle={{ padding: 24 }}
		extra={
			<div className={styles.salesCardExtra}>
				{dropdownGroup}
				<div className={styles.salesTypeRadio}>
					<Radio.Group value={salesType} onChange={handleChangeSalesType}>
						<Radio.Button value="all">全部渠道</Radio.Button>
						<Radio.Button value="online">线上</Radio.Button>
						<Radio.Button value="stores">门店</Radio.Button>
					</Radio.Group>
				</div>
			</div>
		}
		style={{ marginTop: 24 }}
	>
		<div
			style={{
				minHeight: 380
			}}
		>
			<h4 style={{ marginTop: 8, marginBottom: 32 }}>销售额</h4>
			<Pie
				hasLegend
				subTitle={'销售额'}
				total={() => <Yuan>{salesPieData.reduce((pre, now) => now.y + pre, 0)}</Yuan>}
				data={salesPieData}
				valueFormat={(value) => <Yuan>{value}</Yuan>}
				height={248}
				lineWidth={4}
			/>
		</div>
	</Card>
));

export default ProportionSales;
