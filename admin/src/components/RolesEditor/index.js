import React, { Component } from 'react';
import { Row, Col } from 'antd';
import { uniqBy } from 'lodash';
import GGEditor, { Mind } from 'gg-editor';
import EditorMinimap from './components/EditorMinimap';
import { RolesItemPannel } from './components/EditorItemPanel';
import { MindContextMenu } from './components/EditorContextMenu';
import { MindToolbar } from './components/EditorToolbar';
import { MindDetailPanel } from './components/EditorDetailPanel';
import styles from './index.less';

GGEditor.setTrackable(false);

const data = {
  roots: [
    {
      label: '用户',
      children: [
        {
          label: '商务',
        },
        {
          label: '财务',
        },
        {
          label: '人事',
        },
        {
          label: '行政',
        },
      ],
    },
  ],
};

export default class extends Component {
  renderTree = (data, userAuthoritys) => {
    return data
      .sort((a, b) => a.sort - b.sort)
      .filter((item) => {
        // console.log(item.id, userAuthoritys);
        return userAuthoritys.includes(item.id);
      })
      .map((item) => {
        return item;
      });
  };

  render() {
    const { user, roles, authoritys, onRolesCheck } = this.props;
    let userAuthoritys = [];
    roles.forEach((item) => {
      if (user.roles.map((role) => role.id).includes(item.id)) {
        userAuthoritys = userAuthoritys.concat(item.authoritys);
      }
    });
    userAuthoritys = uniqBy(userAuthoritys, 'id');
    console.log(userAuthoritys);
    // console.log(userAuthoritys.map((item) => item.id));
    console.log(this.renderTree(authoritys, userAuthoritys.map((item) => item.id)));

    return (
      <GGEditor className={styles.editor}>
        <Row type="flex" className={styles.editorHd}>
          <Col span={24}>
            <MindToolbar />
          </Col>
        </Row>
        <Row type="flex" className={styles.editorBd}>
          <Col span={4} className={styles.editorSidebar}>
            <RolesItemPannel roles={roles} user={user} onRolesCheck={onRolesCheck} />
          </Col>
          <Col span={16} className={styles.editorContent}>
            <Mind
              data={{
                roots: [
                  {
                    label: '用户',
                    children: this.renderTree(authoritys, userAuthoritys.map((item) => item.id)),
                  },
                ],
              }}
              className={styles.mind}
            />
          </Col>
          <Col span={4} className={styles.editorSidebar}>
            <MindDetailPanel />
            <EditorMinimap />
          </Col>
        </Row>
        <MindContextMenu />
      </GGEditor>
    );
  }
}
