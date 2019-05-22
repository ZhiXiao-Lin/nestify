import React, { useState } from 'react';
import { Carousel } from 'antd';

import config from '../../_config';
import { banner_list, banner_bottom } from '../../_mock';

import './index.scss';

const SimpleSwiper = ({ list }) => (
    <Carousel autoplay={list.length !== 1} effect="fade" easing="ease-in-out" dots={false}>
        {list.map((img, i) => (
            <div key={i}>
                <div className="image-flexible" style={{ width: "100%", height: "100%", backgroundImage: `url(${config.STATIC_IMAGE_ROOT}${img.url})` }}></div>
            </div>
        ))}
    </Carousel>
)

export default ({ home }) => {
    if (!!home) {
        return (
            <div className="hdz-home-background">
                <SimpleSwiper list={banner_list} />
                <div className="image-flexible" style={{ height: "280px", backgroundImage: `url(${config.STATIC_IMAGE_ROOT}${banner_bottom.url})` }}></div>
            </div>
        )
    } else {
        return (
            <div className="hdz-home-background">
                <SimpleSwiper list={[banner_list.shift()]} />
            </div>
        )
    }
    
}