import React from 'react';
import Link from 'umi/link';
import Exception from '@/components/Exception';

const Exception404 = () => <Exception type="404" desc={404} linkElement={Link} backText={'返回'} />;

export default Exception404;
