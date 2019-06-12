import React from 'react';
import { Card, List, Avatar } from 'antd';
import InterestedBrochure from '../components/InterestedBrochure/index';
import DownloadApp from '../components/DownloadApp/index';

// class SideNav extends Component {
//     constructor(props) {
//         super(props);
//         this.state = {  }
//     }
//     render() {
//         return (
//             <div>
//                 <Card
//                     title="掘金优秀作者"
//                     style={{ width: '100%' }}
//                     hoverable={'true'}
//                     bodyStyle={{padding:'0 16px'}}
//                     actions={[<a to='/recommendation/authors/recommended' style={{color:'#007fff'}}>查看更多></a>]}
//                     >
//                     <List
//                         itemLayout="horizontal"
//                         dataSource={this.props.goodAuthor}
//                         renderItem={item => (
//                         <List.Item onClick={()=>window.location.href='/user/'+item.id}>
//                             <List.Item.Meta
//                             avatar={<Avatar size={46} src={item.userImage} />}
//                             title={item.title}
//                             description={<div className="overflow-ellipsis">{item.desc}</div>}
//                             />
//                         </List.Item>
//                         )}
//                     />
//                 </Card>
//                 <InterestedBrochure recommendBooks={this.props.recommendBooks} />
//                 <DownloadApp />
//                 <Card
//                     style={{ width: '100%',marginTop:'20px' }}
//                     hoverable={'true'}
//                     bodyStyle={{padding:'0 16px'}}
//                     >
//                     <List
//                         itemLayout="horizontal"
//                         dataSource={this.props.linkList}
//                         className="linkCard"
//                         renderItem={item => (
//                         <List.Item onClick={()=>window.location.href='/repos'}>
//                             <List.Item.Meta
//                             avatar={<img alt='' src={item.linkImage} />}
//                             title={item.title}
//                             />
//                         </List.Item>
//                         )}
//                     />
//                 </Card>
//             </div>
//         );
//     }
// }

function SideNav({ goodAuthor, recommendBooks, linkList }) {
    return (
        <div>
            <Card
                title="掘金优秀作者"
                style={{ width: '100%' }}
                hoverable={'true'}
                bodyStyle={{ padding: '0 16px' }}
                actions={[
                    <a to="/recommendation/authors/recommended" style={{ color: '#007fff' }}>
                        查看更多>
                    </a>
                ]}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={goodAuthor}
                    renderItem={(item) => (
                        <List.Item onClick={() => (window.location.href = '/user/' + item.id)}>
                            <List.Item.Meta
                                avatar={<Avatar size={46} src={item.userImage} />}
                                title={item.title}
                                description={<div className="overflow-ellipsis">{item.desc}</div>}
                            />
                        </List.Item>
                    )}
                />
            </Card>
            <InterestedBrochure recommendBooks={recommendBooks} />
            <DownloadApp />
            <Card
                style={{ width: '100%', marginTop: '20px' }}
                hoverable={'true'}
                bodyStyle={{ padding: '0 16px' }}
            >
                <List
                    itemLayout="horizontal"
                    dataSource={linkList}
                    className="linkCard"
                    renderItem={(item) => (
                        <List.Item onClick={() => (window.location.href = '/repos')}>
                            <List.Item.Meta
                                avatar={<img alt="" src={item.linkImage} />}
                                title={item.title}
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}

export default SideNav;
