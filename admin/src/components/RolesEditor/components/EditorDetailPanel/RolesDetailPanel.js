import React from 'react';
import { Card } from 'antd';
import { CanvasPanel, DetailPanel } from 'gg-editor';
import styles from './index.less';

const RolesDetailPanel = () => {
  return (
    <DetailPanel className={styles.detailPanel}>
      <CanvasPanel>
        <Card
          type="inner"
          size="small"
          title="排除的权限"
          bordered={false}
          style={{ paddingBottom: 200 }}
        />
      </CanvasPanel>
    </DetailPanel>
  );
};

export default RolesDetailPanel;
