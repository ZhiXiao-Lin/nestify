import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import router from 'umi/router';
import { connect } from 'dva';
import { Layout, Row, Col, Form } from 'antd';

import styles from './index.css';

const { Content } = Layout;

@connect(({ contents, loading }) => ({
	contents: contents.records,
	treeRoot: contents.treeRoot,
	selectedNode: contents.selectedNode,
	loading: loading.models.contents
}))
@Form.create()
export default class extends React.Component {
	render() {
		return (
			<Layout>
				<Content className={styles.normal}>
					<Row className="filter-row" gutter={6}>
						<Col className="gutter-row" span={20} />
					</Row>
				</Content>
			</Layout>
		);
	}
}
