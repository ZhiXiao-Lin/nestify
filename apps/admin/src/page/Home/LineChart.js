import React, { Component } from 'react';
import cssModules from 'react-css-modules';
import moment from 'moment';
import { Card, DatePicker, Row, Col, Tabs } from 'antd';
import { NumberInfo } from 'ant-design-pro';
import ReactHighcharts from 'react-highcharts';
import styles from './style.less';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

@cssModules(styles)
class LineChart extends Component {
  handleTabChange = (key) => {
    const { onIndicatorChange } = this.props;
    typeof onIndicatorChange === 'function' && onIndicatorChange(key);
  };

  renderDashboard() {
    const { dashboardData } = this.props;

    return (
      <Row>
        <Col span={8}>
          <NumberInfo
            subTitle="指标1"
            total={dashboardData.indicator1}
          />
        </Col>
        <Col span={8}>
          <NumberInfo
            subTitle="指标2"
            total={dashboardData.indicator2}
          />
        </Col>
        <Col span={8}>
          <NumberInfo
            subTitle="指标3"
            total={dashboardData.indicator3}
          />
        </Col>
      </Row>
    );
  }

  renderDashboradTab() {
    const { indicators } = this.props;

    return (
      <div className="chart-tab">
        <Tabs defaultActiveKey={(indicators[0] || {}).id} onChange={this.handleTabChange}>
          {indicators.map(item => (
            <TabPane
              tab={
                <Row gutter={8} style={{ width: 138, margin: '8px 0' }}>
                  <NumberInfo subTitle={item.name} total={item.value} />
                </Row>
              }
              key={item.id}
            />
          ))}
        </Tabs>
      </div>
    );
  }

  render() {
    const { loading, ranges, chartOptions, onRangeChange } = this.props;
    return (
      <Card
        bordered={false}
        style={{ marginTop: 40, minHeight: 548 }}
        loading={loading}
      >
        <div styleName="chart-toolbar">
          <RangePicker
            format="YYYY-MM-DD"
            defaultValue={[moment(), moment()]}
            ranges={ranges}
            onChange={onRangeChange}
          />
        </div>
        {this.renderDashboradTab()}
        <div styleName="chart">
          <ReactHighcharts
            config={chartOptions}
          />
        </div>
      </Card>
    );
  }
}

export default LineChart;
