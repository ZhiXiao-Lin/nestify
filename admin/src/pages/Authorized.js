import React, { Fragment } from 'react';
import Redirect from 'umi/redirect';
import { connect } from 'dva';

@connect(({ routing }) => ({
  location: routing.location,
}))
class Authorized extends React.Component {
  state = {
    routes: [],
  };

  componentDidMount() {
    const { routes } = this.props;

    if (!!routes) {
      this.treeToArray(routes);
    }

    this.props.dispatch({
      type: 'user/fetchCurrentUser',
    });
  }

  treeToArray = (tree) => {
    const { routes } = this.state;
    return tree.map((item) => {
      if (item.routes && item.routes.length > 0) {
        this.treeToArray(item.routes, item);
      }

      routes.push(item);

      this.setState((state) => ({
        ...state,
        routes,
      }));
    });
  };

  render() {
    const { routes } = this.state;
    const { children, location } = this.props;

    const route = routes.find((item) => item.path === location.pathname);

    const userJson = sessionStorage.getItem('currentUser');

    const currentUser = !!userJson ? JSON.parse(userJson) : null;

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

    if (
      !!route &&
      !route.no_authority &&
      !currentUser.isSuperAdmin &&
      !currentUser.role.authorities.find((item) => item.token === location.pathname)
    ) {
      return (
        <Redirect
          to={{
            pathname: '/exception/403',
          }}
        />
      );
    }

    return <Fragment>{children}</Fragment>;
  }
}

export default ({ children }) => (
  <Authorized routes={children.props.route.routes}>{children}</Authorized>
);
