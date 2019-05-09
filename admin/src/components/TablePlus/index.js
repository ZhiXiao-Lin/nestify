import React from 'react';
import { Card, Tooltip, Button, Icon, Row, Col } from 'antd';
import StandardTable from '@/components/StandardTable';
import PageHeaderWrapper from '@/components/PageHeaderWrapper';

import styles from './index.less';

const ButtonGroup = Button.Group;

const TablePlus = ({ title, loading, actions, selectedRows, data, columns, onSelectRow, onChange }) => {
	return (
		<PageHeaderWrapper title={title}>
			<Card bordered={false}>
				<div className={styles.tableList}>
					{actions ? (
						<Row>
							<Col>
								<ButtonGroup>
									{actions.map((item, index) => (
										<Tooltip key={index} placement="topLeft" title={item.name}>
											<Button type="danger" onClick={(e) => item.action(e)}>
												{item.icon}
											</Button>
										</Tooltip>
									))}
								</ButtonGroup>
							</Col>
						</Row>
					) : null}
					<StandardTable
						selectedRows={selectedRows}
						loading={loading}
						data={data}
						columns={columns}
						onSelectRow={onSelectRow}
						onChange={onChange}
					/>
				</div>
			</Card>
		</PageHeaderWrapper>
	);
};

export default TablePlus;
