import _ from 'lodash';
import React from 'react';
import Redirect from 'umi/redirect';
import pathToRegexp from 'path-to-regexp';
import { connect } from 'dva';
import Authorized from '@/utils/Authorized';
import { message } from 'antd';
import router from 'umi/router';

function AuthComponent({ currentUser, children, location, routerData, status }) {
	const isLogin = !!localStorage.getItem('token');

	const getRouteAuthority = (path, routeData) => {
		let authorities;
		routeData.forEach((route) => {
			// match prefix
			if (pathToRegexp(`${route.path}(.*)`).test(path)) {
				authorities = route.authority || authorities;

				// get children authority recursively
				if (route.routes) {
					authorities = getRouteAuthority(path, route.routes) || authorities;
				}
			}
		});
		return authorities;
	};

	// if (_.isEmpty(currentUser)) {
	// 	message.warn('身份验证失败');
	// 	router.replace('/user/login');
	// }

	return (
		<Authorized
			authority={getRouteAuthority(location.pathname, routerData)}
			noMatch={isLogin ? <Redirect to="/exception/403" /> : <Redirect to="/user/login" />}
		>
			{children}
		</Authorized>
	);
}
export default connect(({ menu: menuModel, user, login: loginModel }) => ({
	routerData: menuModel.routerData,
	currentUser: user.currentUser,
	status: loginModel.status
}))(AuthComponent);
