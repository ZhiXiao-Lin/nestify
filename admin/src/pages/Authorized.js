import React, { Fragment } from 'react';
import Redirect from 'umi/redirect';
import _ from 'lodash';
import { message } from 'antd';
import { connect } from 'dva';

@connect(({ user }) => ({
	currentUser: user.currentUser
}))
class Authorized extends React.Component {
	componentDidMount() {
		const { currentUser } = this.props;

		if (!currentUser) {
			this.props.dispatch({
				type: 'user/fetchCurrentUser'
			});
		}
	}

	render() {
		const { children, authority, noMatch, currentUser } = this.props;

		if (!currentUser) {
			return noMatch;
		} else {
			return <Fragment>{children}</Fragment>;
		}
	}
}

export default ({ children }) => (
	<Authorized authority={children.props.route.authority} noMatch={<Redirect to={'/user/login'} />}>
		{children}
	</Authorized>
);
