import React from 'react';
import './home.less';
// class HomeNav extends Component {
//     constructor(props) {
//         super(props);
//         this.state = {}
//     }
//     render() {
//         return (
//             <ul>
//                 {this.props.tags.map((item,index)=>{
//                     return <li key={item.path}>
//                         <NavLink to={`/timeline/${item.path}`}>{item.text}</NavLink>
//                     </li>
//                 })}
//             </ul>
//         );
//     }
// }

function HomeNav(props) {
    return (
        <ul>
            {props.tags.map((item, index) => {
                return (
                    <li key={item.path}>
                        <a href={`/timeline/${item.path}`}>{item.text}</a>
                    </li>
                );
            })}
        </ul>
    );
}

export default HomeNav;
