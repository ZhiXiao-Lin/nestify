import React from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

const Contact = ({ setting }) => (
    <div className="phone-call">
        <div className="24hours-calling">
            <p>48小时服务电话</p>
            <p>{setting.serviceHotline}</p>
        </div>
        <div className="ohter-calling">
            <p>景区办公电话：{setting.officeTel}</p>
            <p>商务合作热线：{setting.cooperationHotline}</p>
            <p>票务预订热线：{setting.bookingHotline}</p>
        </div>
    </div>
)

const TourGuide = () => {
    const toRenderTourGuide = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        return (
            <div className="tour-guide">
                <div className="guide">
                    <div className="img-blank"></div>
                    <div>
                        <p>开放时间：</p>
                        <p>方大特钢生态森林全面对外开放</p>
                    </div>
                    <div>{setting.openInfo.slice(0, 75)}</div>
                    <a className="guide-more" href="javascript:;"></a>
                </div>
                <Contact setting={setting} />
            </div>
        )
    }
    return (
        <GlobalContext.Consumer>
            {toRenderTourGuide()}
        </GlobalContext.Consumer>
    )
}


TourGuide.Contact = Contact;
export default TourGuide;
