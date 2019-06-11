import React from 'react';
import Link from 'umi/link';
import Exception from '@/components/Exception';

const Exception404 = () => (
  <Exception type="404" desc={'页面未找到'} linkElement={Link} backText={'返回首页'} />
);

export default Exception404;
