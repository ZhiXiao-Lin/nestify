import React, { Component } from 'react';
import { Avatar } from 'antd';
import './home.less';

class HomeSecondNav extends Component {
    constructor(props) {
        super(props);
        this.state = {
            tags: [
                {
                    text: '发沸点',
                    icon: '//b-gold-cdn.xitu.io/v3/static/img/pin-icon.614c59d.svg'
                },
                {
                    text: '写文章',
                    icon: '//b-gold-cdn.xitu.io/v3/static/img/write-icon.b3ba8ac.svg'
                },
                {
                    text: '分享链接',
                    icon: '//b-gold-cdn.xitu.io/v3/static/img/share-icon.f681abf.svg'
                }
            ]
        };
    }

    //二级导航事件
    handleClick = (i) => {
        console.log(i);
    };

    render() {
        return (
            <div className="secondNav">
                <Avatar shape="square" size={50} icon="user" src={this.props.userImage} />
                <ul>
                    {this.state.tags.map((item, index) => {
                        return (
                            <li key={index} onClick={this.handleClick.bind(this, index)}>
                                <img src={item.icon} alt={item.text} />
                                {item.text}
                            </li>
                        );
                    })}
                </ul>
                <a to={`/editor/drafts`}>草稿</a>
            </div>
        );
    }
}

export default HomeSecondNav;
