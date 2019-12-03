import React, { Component } from 'react';
import G2 from 'components/Charts/G2';
import DataSet from '@antv/data-set';
import mapData from '../data/world.geo.json';
import data from '../data/earthquake.json';
const { Chart, Axis, Geom, Tooltip, Legend, Coord, View } = G2;

const cols = {
  x: { sync: true, nice: false },
  y: { sync: true, nice: false }
}

const ds = new DataSet();

// draw the map
const dv = ds
  .createView('back')
  .source(mapData, {
    type: 'GeoJSON'
  })
  .transform({
    type: 'geo.projection',
    projection: 'geoMercator',
    as: ['x', 'y', 'centroidX', 'centroidY']
  });
// draw the bubble plot
const userData = ds.createView().source(data);
userData.transform({
  type: 'map',
  callback: obj => {
    const projectedCoord = dv.geoProjectPosition(
      [obj.lng * 1, obj.lat * 1],
      'geoMercator'
    );
    obj.x = projectedCoord[0];
    obj.y = projectedCoord[1];
    obj.deaths = obj.deaths * 1;
    obj.magnitude = obj.magnitude * 1;
    return obj;
  }
});

class Map extends Component {
  render() {
    return (
      <Chart
        data
        scale={cols}
        forceFit
      >
        <Coord reflect />
        <Legend visible={false} />
        <Axis visible={false} />
        <Tooltip
          showTitle={false}
          containerTpl="<div class=&quot;g2-tooltip&quot; style=&quot;color:transparent !important;border: 1px solid rgb(51, 51, 51);&quot;><table class=&quot;g2-tooltip-list&quot;></table></div>"
          itemTpl="<tr data-index={index}><td style=&quot;padding: 5px; background-color:#545454&quot;>{name}</td><td style=&quot;padding: 5px; background-color:#fff;color: #000&quot;>{value}</td></tr>"
          g2-tooltip={{
            borderRadius: '2px',
            backgroundColor: '#DDDDDD',
            padding: 0,
            border: '1px solid #333'
          }}
        />
        <View data={dv}>
          <Geom
            type="polygon"
            tooltip={false}
            position="x*y"
            style={{
              fill: '#ddd',
              lineWidth: 0.5,
              stroke: '#fff',
              fillOpacity: 0.85
            }}
          />
        </View>
        <View data={userData}>
          <Geom
            type="point"
            position="x*y"
            size={['deaths', [2, 30]]}
            shape="circle"
            opacity={0.45}
            color="#FF2F29"
            tooltip="date*location*lat*lng*deaths*magnitude"
          />
        </View>
      </Chart>
    );
  }
}

export default Map;
