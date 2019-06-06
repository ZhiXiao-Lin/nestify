// data-set 可以按需引入，除此之外不要引入别的包
import React, { Fragment } from 'react';
import { Chart, Axis, Coord, Geom, Guide, Shape } from 'bizcharts';
import { Divider } from 'antd';

const { Html, Arc } = Guide;

// 下面的代码会被作为 cdn script 注入 注释勿删
// CDN START
function creatData() {
    const data = [];
    let val = Math.random() * 100;
    val = val.toFixed(1);
    data.push({ value: val * 1 });
    return data;
}

let data = creatData();


// 自定义Shape 部分
Shape.registerShape('point', 'pointer', {
    drawShape(cfg, group) {
        let point = cfg.points[0]; // 获取第一个标记点
        point = this.parsePoint(point);
        const center = this.parsePoint({ // 获取极坐标系下画布中心点
            x: 0,
            y: 0,
        });
        // 绘制指针
        group.addShape('line', {
            attrs: {
                x1: center.x,
                y1: center.y,
                x2: point.x,
                y2: point.y,
                stroke: cfg.color,
                lineWidth: 5,
                lineCap: 'round',
            },
        });
        return group.addShape('circle', {
            attrs: {
                x: center.x,
                y: center.y,
                r: 12,
                stroke: cfg.color,
                lineWidth: 4.5,
                fill: '#fff',
            },
        });
    },
});

const color = ['#5aca23', '#0086FA', '#FFBF00', '#F5222D'];
const cols = {
    value: {
        min: 0,
        max: 100,
        tickInterval: 10,
        nice: false,
    },
};

export default class extends React.Component {
    constructor() {
        super();
        this.state = {
            data,
            lineWidth: 25,
        };
    }

    componentDidMount() {
        const self = this;
        setInterval(() => {
            data = creatData();
            self.setState({
                data,
            });
        }, 1000);
    }

    renderColor = (val) => {
        const { lineWidth } = this.state;
        return <Fragment>
            <Arc
                zIndex={0}
                start={[0, 0.965]}
                end={[100, 0.965]}
                style={{ // 底灰色
                    stroke: 'rgba(0, 0, 0, 0.09)',
                    lineWidth,
                }}
            />
            {val > 0 &&
                <Arc
                    zIndex={1}
                    start={[0, 0.965]}
                    end={[val < 15 ? val : 15, 0.965]}
                    style={{
                        stroke: color[0],
                        lineWidth,
                    }}
                />}
            {val > 15 &&
                <Arc
                    zIndex={1}
                    start={[15, 0.965]}
                    end={[val < 50 ? val : 50, 0.965]}
                    style={{
                        stroke: color[1],
                        lineWidth,
                    }}
                />}
            {val > 50 && <Arc
                zIndex={1}
                start={[50, 0.965]}
                end={[val < 85 ? val : 85, 0.965]}
                style={{
                    stroke: color[2],
                    lineWidth,
                }}
            />}
            {val > 85 && <Arc
                zIndex={1}
                start={[85, 0.965]}
                end={[val < 100 ? val : 100, 0.965]}
                style={{
                    stroke: color[3],
                    lineWidth,
                }}
            />}
        </Fragment>
    }

    render() {
        const { name, data } = this.props;

        let val = !!data ? data.cpu : 0;

        val = val > 99 ? 99 : val;

        return (
            <Fragment>
                <Divider orientation="left">{name}</Divider>
                <Chart height={480} data={[{ value: val }]} scale={cols} padding={[0, 0, 200, 0]} forceFit>
                    <Coord type="polar" startAngle={-9 / 8 * Math.PI} endAngle={1 / 8 * Math.PI} radius={0.75} />
                    <Axis
                        name="value"
                        zIndex={2}
                        line={null}
                        label={{
                            offset: -20,
                            textStyle: {
                                fontSize: 18,
                                fill: '#CBCBCB',
                                textAlign: 'center',
                                textBaseline: 'middle',
                            },
                        }}
                        tickLine={{
                            length: -24,
                            stroke: '#fff',
                            strokeOpacity: 1,
                        }}
                    />
                    <Axis name="1" visible={false} />
                    <Guide>

                        {this.renderColor(val)}

                        <Html
                            position={['50%', '95%']}
                            html={() => (`<div style="width: 300px;text-align: center;font-size: 12px!important;"><p style="font-size: 3em;color: rgba(0,0,0,0.85);margin: 0;">${!val ? '加载中...' : val.toFixed(2) + '%'}</p></div>`)}
                        />
                    </Guide>
                    <Geom
                        type="point"
                        position="value*1"
                        shape="pointer"
                        color="#1890FF"
                        active={false}
                        style={{ stroke: '#fff', lineWidth: 1 }}
                    />
                </Chart>
            </Fragment>
        );
    }
}
