import React from 'react';
import useSWR from 'swr';
import { PageHeader } from 'ant-design-pro';
import cssModules from 'react-css-modules';

import styles from './style.less';

const OrderPage = () => {
  const get = url => fetch(url).then(data => data.json());
  const { data: orders, error } = useSWR('http://127.0.0.1:8888/api/user', get);

  if (error) return <div>failed to load</div>
  if (!orders) return <div>loading...</div>

  return (
    <div>
      <PageHeader content="" breadcrumbList={[{ title: '订单管理', url: '#' }, { title: '订单列表' }]} />
      {orders.map(order => <p>{order.id}-{order.name}</p>)}
    </div>
  );
};

export default cssModules(styles)(OrderPage);