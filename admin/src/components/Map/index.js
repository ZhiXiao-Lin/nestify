import React, { Component, Fragment } from 'react';
import { message } from 'antd';
import { Map, Markers, Marker, InfoWindow } from 'react-amap';

export class MapA extends Component{
	state = {
		markers: [], 
		mapCenter: '', 
		mapZoom: '', 
		infoWindows: {
			position: {},
			content: '',
			offset: []
		}
	}
	mapPlugins = ['ToolBar', 'Scale']
	mapEvents = {
		created: (instance) => {
			this.MAP = instance;
		}
	}
	markerEvents = {
		click: (e, marker) => {
			let { position, index, label } = marker.getExtData();
			this.setState((prev) => ({
				mapCenter: position,
			    infoWindows: {
			    	position: position,
			    	content: label,
			    	offset: [0, -20]
			    }
			}))
		}, 
		mouseover: (e, marker) => {
			let { position, index, label } = marker.getExtData();
			this.setState((prev) => ({
			    infoWindows: {
			    	position: position,
			    	content: label,
			    	offset: [0, -40]
			    }
			}))
		}, 
		mouseout: (e, marker) => {
			this.setState((prev) => ({
			    infoWindows: {
			    	position: {},
			    	content: '',
			    	offset: []
			    }
			}))
		}
	}
	componentWillUnmount() {
		this.MAP.destroy();
	}
	componentWillReceiveProps(props) {
		this.setState(() => ({
		    markers: props.markers
		}), () => {
			if (props.markers.length !== 0) {
				this.MAP.setFitView();
			}
		});
	}

	render() {
		const { markers, mapCenter, mapZoom, infoWindows: { position, content, offset } } = this.state;
		const { height, location, zoom } = this.props;
		const center = mapCenter ? mapCenter : location;
		const zoomA = mapZoom ? mapZoom : zoom;
		return (
			<div style={{ width: "100%", height: height || "400px" }}>
				<Map 
					plugins={this.mapPlugins}
					center={center}
					zoom={zoomA}
					events={this.mapEvents}
				>
					{location.longitude && location.latitude ? <Marker position={location} /> : ''}
					<Markers markers={markers} events={this.markerEvents} />
					{!!Object.keys(position).length && <InfoWindow position={position} offset={offset} visible showShadow autoMove isCustom><p>{content}</p></InfoWindow>}
				</Map>
			</div>
		)
	}

}