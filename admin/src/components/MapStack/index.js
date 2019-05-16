import React, { Component, Fragment }                   from 'react';
import { Tag, Radio, Layout, Button, Divider, message } from 'antd';
import { Map, Markers, InfoWindow }                     from 'react-amap';
import _                                                from 'lodash';

import styles                                           from './index.less';

const CheckableTag = Tag.CheckableTag;
const RadioButton  = Radio.Button;
const RadioGroup   = Radio.Group;

export default class MapStack extends Component {
	state      = {
		exinfo: {
			mapCenter: '',
			mapZoom: '',
			alignDirection: {
				align: "vertical",
				axisX: "left",
				axisY: "top"
			},
			layersBounds: {},
			groupsinfo: [],
			groupsitems: {},
			images: []
		}, 
		isLayerShow: {}, 
		mapLayers: [], 
		infoWindowContent: '',
		infoWindowVisible: false,
		infoWindowPosition: null
	};
	MAP        = null
	AMAP       = null
	imageLayer = {}
	mapPlugins = ['ToolBar', 'Scale']
	mapEvents  = {
    	created: (instance) => {
    		this.MAP = instance;
    		this.AMAP = window.AMap;
    		this.initialState(this.props);
    	}
    }
    layerMarkerEvents = {
    	click: (e) => this.toShowInfoWindow(e), 
    	dragend: (e) => this.toSetMarkerPosition(e)
    };
    boundMarkerEvents = {
    	dragend: (e) => this.toSetBoundPostion(e)
    };
    infoWindowEvents = {
    	close: () => this.setState({ infoWindowVisible: false, infoWindowContent: '', infoWindowPosition: null })
    }
    componentWillReceiveProps(nextProps) {
    	this.initialState(nextProps);
    }
	componentWillUnmount() {
    	this.MAP.destroy();
    }
	initialState = (props) => {
		const { exinfo }       = props;
		if (_.isEmpty(exinfo)) {
			return;
		}
		const { layersBounds } = exinfo;
		const mapLayers        = [];
		const isLayerShow      = {};
		exinfo.groupsinfo.forEach((item) => {
			isLayerShow[item.name] = true;
		});
		if (_.isEmpty(this.MAP)) {
			this.setState((prevState) => {
				const stateExinfo = _.cloneDeep(prevState.exinfo);
				return {
					exinfo: Object.assign(stateExinfo, exinfo), 
					isLayerShow, 
					mapLayers
				}
			})
		} else {
			const mapBounds = this.MAP.getBounds();
			const [ BL, TR ] = this.toCreateHalfViewBounds(mapBounds);
			mapLayers.push(new this.AMAP.TileLayer());
			if (exinfo && exinfo.images) {
				exinfo.images.forEach((item, i) => {
					if (_.isEmpty(item.imgsrc)) {
						return;
					}
					if (!_.isEmpty(this.imageLayer[name])) {
						return;
					}
					const name = item.name || `底图${i+1}`;
					let bottomleft, topright;
					if (_.isEmpty(layersBounds[name])) {
						bottomleft = BL;
						topright = TR;
						exinfo.layersBounds[name] = {
							bottomleft: new this.AMAP.LngLat(BL[0], BL[1]), 
							topright: new this.AMAP.LngLat(TR[0], TR[1])
						}
					} else {
						bottomleft = [layersBounds[name].bottomleft.lng, layersBounds[name].bottomleft.lat]
						topright = [layersBounds[name].topright.lng, layersBounds[name].topright.lat]
						exinfo.layersBounds[name] = {
							bottomleft: layersBounds[name].bottomleft, 
							topright: layersBounds[name].topright
						}
					}
					isLayerShow[name] = true;
					this.imageLayer[name] = new this.AMAP.ImageLayer({
	                    url: item.imgsrc,
						bounds: new this.AMAP.Bounds(bottomleft, topright),
	                    zooms: [0, 18],
	                    zIndex: 101 + i
			        });
			        mapLayers.push(this.imageLayer[name]);
				});
			}
			this.setState((prevState) => {
				const exinfo = _.cloneDeep(prevState.exinfo);
				return {
					exinfo: Object.assign(exinfo, props.exinfo), 
					isLayerShow: isLayerShow, 
					mapLayers: mapLayers
				}
			})
		}
	}
	onHandleCancel = () => {
		this.initialState(this.props);
	}
	onHandleSubmit = () => {
		const { exinfo } = this.state;
		exinfo.mapZoom   = this.MAP.getZoom();
		exinfo.mapCenter = this.MAP.getCenter();
    	this.props.submitHandler(exinfo);
    }
	toSetLegendPostion = (type) => (e) => {
		this.setState((prevState) => {
			const exinfo = _.cloneDeep(prevState.exinfo);
			exinfo.alignDirection[type] = e.target.value;
			return {
				exinfo: exinfo
			}
		});
	}
	toSetMarkerPosition = (e) => {
		const { lnglat, target } = e;
		const { layerName, name } = target.getExtData();
		this.setState((prevState) => {
			const { exinfo }                    = prevState;
			_.find(exinfo.groupsitems[layerName], { name: name }).position = lnglat;
			return { exinfo: exinfo };
		})
	}
	toSetBoundPostion = (e) => {
		const { lnglat, target } = e;
		const { name, location } = target.getExtData();
		this.setState((prevState) => {
			const { exinfo }                    = prevState;
			exinfo.layersBounds[name][location] = lnglat;
			const { bottomleft, topright }      = exinfo.layersBounds[name];
			if (this.imageLayer[name]) {
				this.imageLayer[name].setBounds(new this.AMAP.Bounds(
                	[bottomleft.lng, bottomleft.lat], 
					[topright.lng, topright.lat]
				));
			}
			return { exinfo: exinfo };
		})
	}
	toToggleCheckedState = (name) => (checked) => {
		this.setState((prevState) => {
			const { isLayerShow } = prevState;
			isLayerShow[name]     = checked;
			if (!_.isEmpty(this.imageLayer[name])) {
				checked ? this.imageLayer[name].show() : this.imageLayer[name].hide();
			}
			return { isLayerShow: isLayerShow };
		})
	}
	toShowInfoWindow = async (e) => {
		const { layerName, name } = e.target.getExtData();
		const { exinfo: { groupsitems, mapCenter } } = this.state;
		/*
			展示富文本的接口
		 */
		// const res = await apiAgent('get', `/skus/v1?offset=0&name=${name}`);
		// if ('[object Error]' === Object.prototype.toString.call(res)) {
		// 	message.error('主数据更新失败！');
		// } else if (_.isEmpty(res)) {
		// 	message.info('暂无数据！');
		// } else {
		// 	const { ex_info: { richtexts } } = res.filter((item) => item.name === name)[0];
		// 	this.setState({
		// 		infoWindowVisible: true, 
		// 		infoWindowContent: richtexts[0].content, 
		// 		infoWindowPosition: this.toCheckPositionFormat(groupsitems[layerName][name], mapCenter)
		// 	})
		// }
		// this.setState({
		// 	infoWindowVisible: true,
		// 	infoWindowContent: `${layerName}, ${name}, ${new Date()}`,
		// 	infoWindowPosition: this.toCheckPositionFormat(_.find(groupsitems[layerName], { name: name }).position, mapCenter)
		// });
	}
	toCreateHalfViewBounds = (mapBounds) => {
		let CT             = mapBounds.getCenter();
		let SW             = mapBounds.getSouthWest();
		let NE             = mapBounds.getNorthEast();
		let [ BL, TR, BC ] = [ [SW.lng, SW.lat], [NE.lng, NE.lat], [CT.lng, CT.lat] ];
		let bottomleft     = BL.map((item, i) => (item-BC[i])/2+BC[i]);
		let topright       = TR.map((item, i) => (item-BC[i])/2+BC[i]);
		return [bottomleft, topright];
	}
	toCheckPositionFormat = (position, layersBounds) => {
		try {
		    if (typeof position === "string") {
		        if (/{*}/.test(position)) {
		        	position = JSON.parse(position);``
		        } else {
		        	throw("经纬度坐标格式不正确！必须是LngLat类！");
		        }
		    }
		} catch (err) {
			console.error(err);
		    position = layersBounds;
		}
	    return position;
	}
	toRenderEditButton = (submitHandler) => {
		if (!submitHandler) {
			return;
		} else {
			return (
				<div className="sidePanelBtnWrapper">
				  	<Button onClick={this.onHandleCancel}>重置</Button>
				  	<Button onClick={this.onHandleSubmit}>保存</Button>
				</div>
			)
		}
	}
	toRenderTagsView = () => {
		const { exinfo, isLayerShow } = this.state;
		const { groupsinfo, layersBounds, alignDirection: { align, axisX, axisY } } = exinfo;
        const imageLayerLegends = Object.keys(layersBounds).map((layerName, i) => ({
    		name: layerName, 
    		iconsrc: 'icon-tuceng'
        }))
        const markerLayersLegends = groupsinfo;
		const legends = markerLayersLegends.concat(imageLayerLegends);
		return (
			<div className={`legend-controller toward-${align} vertical-${axisY} horizental-${axisX}`}>
				{legends.map((item, i) => (
					<CheckableTag 
						key={i} 
						className={!isLayerShow[item.name] && 'ant-tag-checkable-unchecked'} 
						checked={!!isLayerShow[item.name]} 
						onChange={this.toToggleCheckedState(item.name)}>
						<span className={`iconfont ${item.iconsrc}`}></span> {item.name}
					</CheckableTag>
				))}
			</div>
		)
	}
	toRenderLayerController = (submitHandler) => {
        const { exinfo: { alignDirection: { align, axisY, axisX } } } = this.state;
        if (!submitHandler) {
        	return;
        } else {
        	return (
        		<div className="layer-controller">
        			<div>
        				<RadioGroup onChange={this.toSetLegendPostion('align')} defaultValue={align}>
        				  <RadioButton value="vertical">竖直排列</RadioButton>
        				  <RadioButton value="horizental">水平排列</RadioButton>
        				</RadioGroup>
        			</div>
        			<div>
        				<RadioGroup onChange={this.toSetLegendPostion('axisY')} defaultValue={axisY}>
        				  <RadioButton value="top">居上</RadioButton>
        				  <RadioButton value="center">居中</RadioButton>
        				  <RadioButton value="bottom">居下</RadioButton>
        				</RadioGroup>
        			</div>
        			<div>
        				<RadioGroup onChange={this.toSetLegendPostion('axisX')} defaultValue={axisX}>
        				  <RadioButton value="left">居左</RadioButton>
        				  <RadioButton value="center">居中</RadioButton>
        				  <RadioButton value="right">居右</RadioButton>
        				</RadioGroup>
        			</div>
        		</div>
        	)
        }
	}
	render() {
        const { submitHandler } = this.props;
        const { exinfo, mapLayers, isLayerShow, infoWindowVisible, infoWindowContent, infoWindowPosition } = this.state;
        const { groupsinfo, groupsitems, layersBounds, mapCenter, mapZoom, alignDirection } = exinfo;
        const draggable = !!submitHandler;
        const layerMarkers = groupsinfo.filter(legend => isLayerShow[legend.name]).reduce((prev, curr, i) => {
            const marks = groupsitems[curr.name].map((marker) => ({
                layerName: curr.name,
                name: marker.name,
                icon: curr.iconsrc,
                color: curr.iconcolor,
				position: this.toCheckPositionFormat(marker.position, mapCenter)
            }))
            return prev.concat(marks);
        }, []);
        const boundMarkers = Object.keys(layersBounds).filter(name => isLayerShow[name] && draggable).reduce((prev, name, i) => {
        	const boundsPoints = [];
        	boundsPoints[0] = {
        		name: name, 
        		location: 'bottomleft', 
        		icon: 'icon-zuoxiajiao', 
        		title: '请移动图钉来标注地图上的位置', 
				position: layersBounds[name].bottomleft || "", 
        		label: {
        			offset: new this.AMAP.Pixel(20, 50), 
        			content: '此坐标点必须在左下角'
        		}
        	};
        	boundsPoints[1] = {
        		name: name, 
        		location: 'topright', 
        		icon: 'icon-youshangjiao', 
        		title: '请移动图钉来标注地图上的位置', 
				position: layersBounds[name].topright || "",
				label: {
        			offset: new this.AMAP.Pixel(20, -30), 
        			content: '此坐标点必须在右上角'
        		}
        	}
        	return prev.concat(boundsPoints);
        }, []);
		return (
			<div className={styles['map-management']}>
				{this.toRenderEditButton(submitHandler)}
				<Layout className="layout left">
					<div className="map-view">
						<Map
							zoom={mapZoom}
							center={mapCenter}
							layers={mapLayers}
							plugins={this.mapPlugins}
							showIndoorMap={false}
							events={this.mapEvents}
						>
							<InfoWindow
								position={infoWindowPosition}
								visible={infoWindowVisible}
								content={infoWindowContent}
								offset={[0, -20]}
								events={this.infoWindowEvents}
							/>
							<Markers
								markers={layerMarkers}
								render={(extData) => <span className={`map-icon iconfont ${extData.icon}`} style={{ color: extData.color }}></span>}
								draggable={draggable}
								events={this.layerMarkerEvents}
							/>
							<Markers
								markers={boundMarkers}
								render={(extData) => <span className={`iconfont ${extData.icon}`} style={{ color: "#000", fontSize: "28px" }}></span>}
								draggable={draggable}
								events={this.boundMarkerEvents}
							/>
							{this.toRenderTagsView()}
						</Map>
					</div>
					{this.toRenderLayerController(submitHandler)}
				</Layout>
			</div>
		)
	}
}