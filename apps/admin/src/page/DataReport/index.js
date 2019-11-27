import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import cssModules from 'react-css-modules';
import { PageHeader } from 'ant-design-pro';
import { Card } from 'antd';
import LineChart from './LineChart';
import DataTable from './DataTable';

import styles from './style.less';

const breadcrumbList = [{
  title: '计划管理'
}, {
  title: '计划列表',
  href: '/project/list/search'
}, {
  title: '数据报表'
}];

@inject('reportStore')
@observer
@cssModules(styles)
class DataReport extends Component {
  async componentWillMount() {
    const { match, reportStore } = this.props;
    const { id } = match.params || {};
    await reportStore.onWillMount(id);
  }

  render() {
    const {
      loading,
      name,
      data,
      dashboardData,
      chartOptions,
      getReportData
    } = this.props.reportStore;

    return (
      <div>
        <PageHeader title={name} breadcrumbList={breadcrumbList} />
        <Card style={{ backgroundColor: '#f0f2f5' }} bordered={false}>
          <LineChart
            loading={loading}
            dashboardData={dashboardData}
            chartOptions={chartOptions}
            onRangeChange={getReportData}
          />
          <DataTable
            loading={loading}
            data={data}
          />
        </Card>
      </div>
    );
  }
}

export default DataReport;
