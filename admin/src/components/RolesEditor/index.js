import React, { Component } from 'react';
import { Row, Col, Tree, Divider } from 'antd';
import { uniqBy } from 'lodash';
import GGEditor, { Mind } from 'gg-editor';
import AuthorityNode from './components/nodes/AuthorityNode';
import EditorMinimap from './components/EditorMinimap';
import { RolesItemPannel } from './components/EditorItemPanel';
import { RolesContextMenu } from './components/EditorContextMenu';
import { MindToolbar } from './components/EditorToolbar';
import { RolesDetailPanel } from './components/EditorDetailPanel';
import styles from './index.less';

const { TreeNode } = Tree;

export default class extends Component {
  state = {
    tabKey: 'basic',
    userAuthoritys: [],
    expandedKeys: [],
    autoExpandParent: true,
    rightClickNodeTreeItem: {
      pageX: '',
      pageY: '',
      id: '',
      categoryName: '',
    },
  };

  componentDidMount() {
    this.getUserAuthoritys();
  }

  componentWillReceiveProps(nextProps) {
    this.getUserAuthoritys();
  }

  getUserAuthoritys = () => {
    const { user, roles } = this.props;

    let userAuthoritys = [];
    roles.forEach((item) => {
      if (user.roles.map((role) => role.id).includes(item.id)) {
        userAuthoritys = userAuthoritys.concat(item.authoritys);
      }
    });
    userAuthoritys = uniqBy(userAuthoritys, 'id').map((item) => item.id);

    this.setState({
      userAuthoritys,
      expandedKeys: userAuthoritys,
      autoExpandParent: false,
    });
  };

  onExpand = (expandedKeys) => {
    this.setState({
      expandedKeys,
      autoExpandParent: false,
    });
  };

  renderTree = (data) => {
    return data
      .sort((a, b) => a.sort - b.sort)
      .map((item) => {
        return item;
      });
  };

  renderTreeNodes = (data) =>
    data
      .sort((a, b) => a.sort - b.sort)
      .map((item) => {
        if (item.children) {
          return (
            <TreeNode title={item.name} key={item.id} dataRef={item}>
              {this.renderTreeNodes(item.children)}
            </TreeNode>
          );
        }
        return <TreeNode {...item} />;
      });

  render() {
    const { user, roles, authoritysTree, onRolesCheck } = this.props;

    return (
      <Row type="flex" className={styles.editorBd}>
        <Col span={8} className={styles.editorSidebar}>
          <Divider orientation="left">角色分配</Divider>
          <RolesItemPannel roles={roles} user={user} onRolesCheck={onRolesCheck} />
        </Col>
        <Col span={16} className={styles.editorContent}>
          <Divider orientation="left">权限预览</Divider>
          <Tree
            style={{ paddingBottom: 200 }}
            blockNode
            checkable
            checkStrictly
            onExpand={this.onExpand}
            checkedKeys={this.state.userAuthoritys}
            expandedKeys={this.state.expandedKeys}
            autoExpandParent={this.state.autoExpandParent}
          >
            {this.renderTreeNodes(authoritysTree)}
          </Tree>
        </Col>
      </Row>
    );
  }
}
