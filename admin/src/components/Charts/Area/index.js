import React, { Fragment } from 'react';
import {
  Chart,
  Geom,
  Axis,
  Tooltip,
} from 'bizcharts';
import { Divider } from 'antd';

const cols = {
  value: {
    min: 10000,
  },
};

export default class extends React.Component {
  render() {
    const { name, data } = this.props;

    const list = data.map((item) => {
      return {
        time: item.time,
        value: item.memory,
      };
    }).reverse();

    return (
      <Fragment>
        <Divider orientation="left">{name}</Divider>
        {list.length <= 0 ? (
          ''
        ) : (
            <Chart height={380} data={list} scale={cols} forceFit>
              <Axis
                name="time"
                label={{
                  formatter: (val) => '',
                }}
              />
              <Axis
                name="value"
                label={{
                  formatter: (val) => (val / 1024 / 1024).toFixed(2) + 'MB',
                }}
              />
              <Tooltip
                crosshairs={{
                  type: 'line',
                }}
              />
              <Geom type="area" position="time*value" />
              <Geom type="line" position="time*value" size={2} />
            </Chart>
          )}
      </Fragment>
    );
  }
}
