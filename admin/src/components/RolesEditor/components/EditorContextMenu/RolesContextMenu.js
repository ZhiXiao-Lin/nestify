import React from 'react';
import { NodeMenu, ContextMenu } from 'gg-editor';
import MenuItem from './MenuItem';
import styles from './index.less';

const RolesContextMenu = () => {
  return (
    <ContextMenu className={styles.contextMenu}>
      <NodeMenu>
        <MenuItem command="delete" text="排除" />
      </NodeMenu>
    </ContextMenu>
  );
};

export default RolesContextMenu;
