import React, { Component } from 'react';
import Swiper from 'swiper';
import 'swiper/dist/css/swiper.min.css'

import './index.scss';

export default class ImagesSwiper extends Component {
	state = {
		className: "SwiperContainer"
	}
	swiper = null;
	componentDidMount() {
		let { className } = this.props;
		if (!!className) {
			this.setState({
				className: className
			})
		} else {
			className = this.state.className;
		}
		this.swiper = new Swiper(`.${className}`, {
			autoplay: true, 
			loop: true, 
			speed: 300, 
            slidesPerView: 4,
            spaceBetween: 12,
            freeMode: true,
            navigation: {
                nextEl: '#next',
                prevEl: '#previous',
            },
        });
	}
	toSlideLinkContent = (direction) => () => {
		try {
			if (direction === "prev") {
				this.swiper.slidePrev(300, () => console.log(direction));
			} else {
				this.swiper.slideNext(300, () => console.log(direction));
			}
		} catch(err) {
			console.log(err);
		}

	}
	render() {
		let { swiperList } = this.props;
		let CLASS_NAME = this.props.className || this.state.className;
		if (!swiperList) {
			swiperList = [];
		}
		return (
			<>
				<div className="images-swiper-container">
					<div className={`swiper-container swiperContainer1 ${CLASS_NAME}`}>
                        <div className="swiper-wrapper images-swiper-list">
							{swiperList.map((item, i) => (
								<div className="swiper-slide" key={i}>
									<a href={item.link}><img src={item.img} alt={item.title} /></a>
								</div>
							))}
                        </div>
                    </div>
                    <div className="btns" id="next"><i className="FDTG fdtg-right-o fs-40"></i></div>
                    <div className="btns" id="previous"><i className="FDTG fdtg-left-o fs-40"></i></div>
				</div>
			</>
		)
	}
}

