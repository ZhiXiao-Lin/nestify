import React from 'react'
import { Card,List } from 'antd';
import './self.less'

// class InterestedBrochure extends Component {
//     constructor(props) {
//         super(props);
//         this.state = { };
//     }
//     render() {
//         return (
//             <Card
//                 title="你可能感兴趣的小册"
//                 style={{ width: '100%',marginTop:'20px' }}
//                 hoverable={'true'}
//                 headStyle={{fontSize:'14px',color:'#333'}}
//                 bodyStyle={{padding:'0 16px'}}
//                 >
//                 <List
//                     itemLayout="horizontal"
//                     dataSource={this.props.recommendBooks}
//                     className="bookCard"
//                     renderItem={item => (
//                     <List.Item onClick={()=>window.location.href='/book/'+item.id}>
//                         <List.Item.Meta
//                         avatar={<img alt='' src={item.bookImage} />}
//                         title={item.title}
//                         description={<p className="book-desc"><span>{item.sellNum+'人已购买'}</span><span className="try-read">试读</span></p>}
//                         />
//                     </List.Item>
//                     )}
//                 />
//             </Card>
//         );
//     }
// }

function InterestedBrochure({recommendBooks}){
    return (
        <Card
            title="你可能感兴趣的小册"
            style={{ width: '100%',marginTop:'20px' }}
            hoverable={'true'}
            headStyle={{fontSize:'14px',color:'#333'}}
            bodyStyle={{padding:'0 16px'}}
            >
            <List
                itemLayout="horizontal"
                dataSource={recommendBooks}
                className="bookCard"
                renderItem={item => (
                <List.Item onClick={()=>window.location.href='/book/'+item.id}>
                    <List.Item.Meta
                    avatar={<img alt='' src={item.bookImage} />}
                    title={item.title}
                    description={<p className="book-desc"><span>{item.sellNum+'人已购买'}</span><span className="try-read">试读</span></p>}
                    />
                </List.Item>
                )}
            />
        </Card>
    );
}

export default InterestedBrochure;