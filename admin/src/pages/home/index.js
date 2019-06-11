import React, { Component, Suspense } from 'react';
import { connect } from 'dva';

import GridContent from '@/components/PageHeaderWrapper/GridContent';
import PageLoading from '@/components/PageLoading';

const SystemStatus = React.lazy(() => import('./SystemStatus'));

@connect(({ status, loading }) => ({
  ...status,
  loading: loading.effects['status/onFileChange'],
}))
export default class Index extends Component {
  render() {
    const { status, loading } = this.props;

    return (
      <GridContent>
        <Suspense fallback={<PageLoading />}>
          <SystemStatus loading={loading} status={status} />
        </Suspense>
      </GridContent>
    );
  }
}
