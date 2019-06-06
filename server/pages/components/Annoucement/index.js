import React, { Component } from 'react';
import GlobalContext from '../../contexts/GlobalContext';

import config from '../../_config';

import './index.scss';

class Annoucement extends Component {
    constructor(props) {
        super(props)
        this.state = {
            notice: props.list.map(item => item.text.replace(/<[^>]+>/g, "").slice(0, 100)),
            current: 0
        }
    }
    componentDidMount() {
        this.toClearTimer();
        this.timer = setInterval(this.toStartNoticeScroller, 4000);
    }
    componentWillUnmount() {
        this.toClearTimer();
    }
    toStartNoticeScroller = () => {
        let { current, notice } = this.state;
        if (current === notice.length - 1) {
            this.setState({ current: 0 });
        } else {
            this.setState({ current: current + 1 });
        }
    }
    toClearTimer = () => {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
    render() {
        const { notice, current } = this.state;
        return (
            <div className="hdz-annoucement">
                <div className="annoucement-contianer">
                    <div className="annoucement-icon">
                        <i className="FDTG fdtg-speaker"></i>
                    </div>
                    <div className="annoucement-content animation">
                        <p><a href="javascript:;">{notice[current]}</a></p>
                    </div>
                </div>
            </div>
        )
    }
}

export default Annoucement;


