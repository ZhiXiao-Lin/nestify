import React from 'react';
import Link from 'umi/link';
import Exception from '@/components/Exception';

const Exception500 = () => (
  <Exception type="500" desc={'内部错误'} linkElement={Link} backText={'返回首页'} />
);

export default Exception500;
