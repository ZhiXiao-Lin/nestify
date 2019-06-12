import React, { Component } from 'react';

class Qrcode extends Component {
    constructor(props) {
        super(props);
        this.state = {
            shareTypes:[
                {
                    image:'//b-gold-cdn.xitu.io/v3/static/img/weibo.8e2f5d6.svg',
                    text:'微博',
                    showQrcode:false,
                },
                {
                    image:'//b-gold-cdn.xitu.io/v3/static/img/wechat.844402c.svg',
                    text:'微信扫一扫',
                    showQrcode:true,
                }
            ]
        }
    }
    render() {
        const QRCode = require('qrcode.react');
        return (
            <ul>
                {this.state.shareTypes.map(item=>{
                    return <li key={item.text} style={{borderBottom:'1px solid rgba(217,222,224,.99)',padding:'10px',cursor:'pointer'}}>
                        <div>
                            <img alt={item.text} src={item.image} style={{width:'24px',height:'24px',marginRight:'5px'}} />
                            <label style={{color:'#8f969c'}}>{item.text}</label>
                        </div>
                        {item.showQrcode && <div style={{textAlign:'center'}}>
                            <QRCode value={this.props.value} />
                        </div>}
                    </li>
                })}
            </ul>
        );
    }
}

export default Qrcode;