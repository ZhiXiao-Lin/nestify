import React, { Fragment } from 'react';
import _ from 'lodash';
import Redirect from 'umi/redirect';
import { connect } from 'dva';

@connect(({ user, routing }) => ({
  currentUser: user.currentUser,
  location: routing.location,
}))
class Authorized extends React.Component {
  componentDidMount() {
    const { currentUser } = this.props;

    if (!currentUser) {
      this.props.dispatch({
        type: 'user/fetchCurrentUser',
      });
    }
  }

  render() {
    const { children, authority, currentUser, location } = this.props;

    if (!currentUser) {
      return (
        <Redirect
          to={{
            pathname: '/user/login',
            state: { referrer: location },
          }}
        />
      );
    }

    return <Fragment>{children}</Fragment>;
  }
}

export default ({ children }) => (
  <Authorized authority={children.props.route.authority}>{children}</Authorized>
);
