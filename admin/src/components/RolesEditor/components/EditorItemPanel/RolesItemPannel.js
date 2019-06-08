import React, { Component } from 'react';
import { Card, Input, Checkbox } from 'antd';

import styles from './index.less';

const Search = Input.Search;

export default class extends Component {
  state = {
    rolesFilter: '',
  };

  onFilterChange = (e) => {
    const { value } = e.target;
    this.setState((state) => ({
      ...state,
      rolesFilter: value,
    }));
  };

  onRolesCheck = (checkedValues) => {
    const { roles, onRolesCheck } = this.props;
    onRolesCheck(roles.filter((item) => checkedValues.includes(item.id)));
  };

  render() {
    const { rolesFilter } = this.state;
    const { user, roles } = this.props;
    const rolesOptions = roles
      .filter((item) => item.name.search(rolesFilter) >= 0)
      .filter((item) => item.token !== 'superAdmin')
      .map((item) => ({ label: item.name, value: item.id }));

    return (
      <Card bordered={false} className={styles.itemPanel}>
        <Search
          placeholder="筛选"
          allowClear
          style={{ marginBottom: 20 }}
          onChange={this.onFilterChange}
          onSearch={(value) => console.log(value)}
        />
        <Checkbox.Group
          options={rolesOptions}
          value={user.roles.map((item) => item.id)}
          onChange={this.onRolesCheck}
        />
      </Card>
    );
  }
}
