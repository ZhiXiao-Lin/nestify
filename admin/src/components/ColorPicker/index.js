import React, { Component } from 'react';
import { HuePicker }       from 'react-color';
import { Icon }            from 'antd';

class ColorPicker extends Component {
	state = {
		color: '#000000'
	}
	toChangeColor = (color) => {
		this.setState({
			color: color.hex
		})
	}
	render() {
		const { color } = this.state;
		const { width } = this.props;
		return (
			<div style={{ width: width || "100%" }}>
				<HuePicker color={color} onChange={this.toChangeColor}/>
				<p style={{ marginBottom: "0px" }}>颜色预览：<span style={{ background: color, display: "inline-block", height: "14px", width: "30px" }}></span></p> 
				<p style={{ marginBottom: "0px" }}>HEX 色值：{color ? color : ''}</p>
			</div>
		);
	}
}

export default ColorPicker;