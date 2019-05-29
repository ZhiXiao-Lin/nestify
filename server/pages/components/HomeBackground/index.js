import React, { useState } from 'react';
import { Carousel } from 'antd';

import config from '../../_config';

import './index.scss';

const banner_list = [{
    name: 'banner_01',
    url: `/banner_01.jpg`
}, {
    name: 'banner_02',
    url: `/banner_02.jpg`
}, {
    name: 'banner_03',
    url: `/banner_03.jpg`
}, {
    name: 'banner_04',
    url: `/banner_04.jpg`
}]

const banner_bottom = {
    name: 'banner_bottom',
    url: '/banner_bottom.jpg'
}

const SimpleSwiper = ({ list }) => console.log(list, "【SimpleSwiper】") | (
    
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
                <SimpleSwiper list={banner_list.slice(0, 1)} />
            </div>
        )
    }
    
}