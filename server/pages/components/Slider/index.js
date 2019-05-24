import React, { Component } from 'react';
import { Carousel } from 'antd';

import './index.scss';

export default class Slider extends Component {
	componentDidMount() {
		const { interval } = this.props;
		if (this.timer) {
			clearInterval(this.timer);
		}
		this.timer = setInterval((slider) => {
			slider.next();
		}, interval || 6000, this.slider);
	}
	componentWillUnmount() {
		if (this.timer) {
			clearInterval(this.timer);
		}
	}
	toRenderSliderItem = (slider) => {

		if (Object.prototype.toString.call(slider) !== "[object Array]" || !slider.length) {
			return (
				<div>
					<p className="slider-title"></p>
				</div>
			)
		} else {
			return slider.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(item => (
				<div key={item.title} style={{ background: `url(${item.img})` }} key={item.img}>
					<img src={item.img} alt={item.title} />
					<p className="slider-title"><a href={item.link}>{item.title}</a></p>
				</div>
			))
		}
	}
    render(){
    	const { menuList, width, height, list } = this.props;
		return (
			<div className="slider-container" style={{ width: width || "100%", height: height || "100%" }}>
				<Carousel ref={(slider) => this.slider = slider} effect="fade">
				    {this.toRenderSliderItem(list)}
				</Carousel>
			</div>
		)
    }
}