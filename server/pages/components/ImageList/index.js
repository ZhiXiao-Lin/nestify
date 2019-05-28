import React, { useState } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const ImageList = () => {
    const toRenderImageList = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className="image-list">
                <div className="image-item-container">
                    <a href="/image/photo?id=1" className="image-item">
                        <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                        <p>休闲沙滩车</p>
                    </a>
                </div>
                <div className="image-item-container">
                    <a href="/image/photo?id=2" className="image-item">
                        <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                        <p>休闲沙滩车</p>
                    </a>
                </div>
                <div className="image-item-container">
                    <a href="/image/photo?id=3" className="image-item">
                        <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                        <p>休闲沙滩车</p>
                    </a>
                </div>
                <div className="image-item-container">
                    <a href="/image/photo?id=4" className="image-item">
                        <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                        <p>休闲沙滩车</p>
                    </a>
                </div>
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderImageList()}
        </GlobalContext.Consumer>
    )
}

export default ImageList;
