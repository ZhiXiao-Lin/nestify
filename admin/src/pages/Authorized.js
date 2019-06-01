import React, { Fragment } from 'react';
import _ from 'lodash';
import Redirect from 'umi/redirect';
import { connect } from 'dva';

@connect(({ routing }) => ({
  location: routing.location,
}))
class Authorized extends React.Component {
  componentDidMount() {
    this.props.dispatch({
      type: 'user/fetchCurrentUser',
    });
  }

  render() {
    const { children, authority, location } = this.props;

    const userStr = sessionStorage.getItem('currentUser');

    const currentUser = !!userStr ? JSON.parse(userStr) : null;

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
