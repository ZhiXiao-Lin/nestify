import React, { Component } from 'react';
import { connect } from 'dva';
import router from 'umi/router';
import { Menu } from 'antd';
import GridContent from '@/components/PageHeaderWrapper/GridContent';
import styles from './Info.less';

const { Item } = Menu;

const menuMap = {
	base		: '基本设置',
	password	: '密码设置',
	// security	: '安全设置',
	// binding		: '账户绑定',
	// notification: '信息通知'
};

@connect(({ user }) => ({
	currentUser: {}
}))
export default class Info extends Component {
	constructor(props) {
		super(props);
		const { match, location } = props;
		const key = location.pathname.replace(`${match.path}/`, '');
		this.state = {
			mode: 'inline',
			selectKey: menuMap[key] ? key : 'base'
		};
	}

	// static getDerivedStateFromProps(props, state) {
	// 	const { match, location } = props;
	// 	let selectKey = location.pathname.replace(`${match.path}/`, '');
	// 	selectKey = menuMap[selectKey] ? selectKey : 'base';
	// 	if (selectKey !== state.selectKey) {
	// 		return { selectKey };
	// 	}
	// 	return null;
	// }

	// componentDidMount() {
	// 	window.addEventListener('resize', this.resize);
	// 	this.resize();
	// }

	// componentWillUnmount() {
	// 	window.removeEventListener('resize', this.resize);
	// }

	// resize = () => {
	// 	if (!this.main) {
	// 		return;
	// 	}
	// 	requestAnimationFrame(() => {
	// 		let mode = 'inline';
	// 		const { offsetWidth } = this.main;
	// 		if (this.main.offsetWidth < 641 && offsetWidth > 400) {
	// 			mode = 'horizontal';
	// 		}
	// 		if (window.innerWidth < 768 && offsetWidth > 400) {
	// 			mode = 'horizontal';
	// 		}
	// 		this.setState({
	// 			mode
	// 		});
	// 	});
	// };

	handleMenuClick = ({ key }) => {
		this.setState({
			selectKey: key
		}, () => {
			router.push(`/studio/user/settings/${key}`);
		});
	};

	render() {
		const { mode, selectKey } = this.state;
		return (
			<GridContent>
				<div className={styles.main}
					// ref={(ref) => {
					// 	this.main = ref;
					// }}
				>
					<div className={styles.leftmenu}>
						<Menu mode={mode} selectedKeys={[ selectKey ]} onClick={this.handleMenuClick}>
							{Object.keys(menuMap).map((item) => <Item key={item}>{menuMap[item]}</Item>)}
						</Menu>
					</div>
					<div className={styles.right}>
						<div className={styles.title}>{menuMap[selectKey]}</div>
						{this.props.children}
					</div>
				</div>
			</GridContent>
		);
	}
}
