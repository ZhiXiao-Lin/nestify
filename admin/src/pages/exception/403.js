import React from 'react';
import Link from 'umi/link';
import Exception from '@/components/Exception';

const Exception403 = () => (
  <Exception type="403" desc={'权限不足'} linkElement={Link} backText={'返回首页'} />
);

export default Exception403;
