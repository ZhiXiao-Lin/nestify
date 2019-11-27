import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import cssModules from 'react-css-modules';
import { Button } from 'antd';
import { PageHeader } from 'ant-design-pro';
import FilterForm from './FilterForm';
import DataTable from './DataTable';

import styles from './style.less';

@inject('searchListStore')
@observer
@cssModules(styles)
class SearchList extends Component {
  constructor(props) {
    super(props);

    this.store = this.props.searchListStore;
  }

  async componentWillMount() {
    const { location, match, history } = this.props;

    await this.store.onWillMount(location, match, history);

    window.dplus.track('page_load', {
      name: '列表页',
      url: this.props.location.pathname
    });
  }

  render() {
    const { create, search, remove, data } = this.store;
    return (
      <div>
        <PageHeader title="计划列表" content="" breadcrumbList={[{ title: '计划管理' }]} />
        <div className="content-card">
          <FilterForm onSubmit={search} />
          <Button type="primary" styleName="btn-create" onClick={create}>新建</Button>
          <DataTable data={data} onDelete={remove} />
        </div>
      </div>
    );
  }
}

export default SearchList;
