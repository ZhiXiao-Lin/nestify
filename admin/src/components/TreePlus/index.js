import React, { Fragment } from 'react';
import { Tree, Card, Button, Tooltip, Popconfirm, Upload } from 'antd';
import _ from 'lodash';

/**

nodes
selectedNode
treeRoot

onAction[ '删除' | '新增' | '重命名' | '刷新' | '导入' || '点选' | '拖拽' ]

 */

const traversal = (nodes, key, callback) => {
	nodes.forEach((item, index, arr) => {
		if (item.id === key) {
			return callback(item, index, arr);
		}
		if (item.children) {
			return traversal(item.children, key, callback);
		}
	});
};

export class Catalog extends React.Component {
	selectHandler = (info) => {
		const { nodes, onAction } = this.props;
		if (!info || info.length === 0) {
			if (!!onAction['点选']) onAction['点选'](null);
			return;
		}

		let item = _.find(nodes, { id: info.slice(-1)[0] });
		if (!!item && !!onAction['点选']) onAction['点选'](item);
	};
	dropHandler = (info) => {
		const { treeRoot, onAction } = this.props;
		if (!treeRoot.children || treeRoot.children.length === 0) return;

		const dragKey = info.dragNode.props.eventKey;
		const dropKey = info.node.props.eventKey;
		// const dropPos = info.node.props.pos.split('-');
		// const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
		// const dragNodesKeys = info.dragNodesKeys;

		const pair = {};
		traversal(treeRoot.children, dragKey, (item, index, arr) => {
			pair.drag = item;
		});

		if (info.dropToGap) {
			traversal(treeRoot.children, dropKey, (item, index, arr) => {
				pair.peers = arr;
			});
			if (!!pair.peers) {
				if (!!pair.peers.find((target) => target.__title === pair.drag.__title)) {
					console.error('duplicated title found! Action abort!');
					return;
				}
			}
		} else {
			traversal(treeRoot.children, dropKey, (item) => {
				pair.drop = item;
			});
			if (!!pair.drop.children.find((target) => target.__title === pair.drag.__title)) {
				console.error('duplicated title found! Action abort!');
				return;
			}
		}

		pair.source = pair.drag['tree_path'];
		const name = pair.source.split('.').slice(-1)[0];

		if (!!pair.drop && !!pair.drop['tree_path']) {
			pair.target = `${pair.drop['tree_path']}.${name}`;
		} else if (!!pair.peers && pair.peers.length > 0) {
			const tps = pair.peers[0]['tree_path'].split('.');
			if (tps.length < 1) {
				console.error('length error!');
				return;
			} else if (tps === 1) pair.target = name;
			else pair.target = `${tps.slice(0, tps.length - 1).join('.')}.${name}`;
		} else {
			console.error('This should not happen!');
			return;
		}

		if (!!onAction['拖拽']) onAction['拖拽'](pair);
	};

	renderTreeNodes = (children) =>
		children.map((item) => {
			if (!!item.children && item.children.length > 0) {
				return (
					<Tree.TreeNode key={item.id} title={item.__title} disabled={item.__isDisabled}>
						{this.renderTreeNodes(item.children)}
					</Tree.TreeNode>
				);
			}
			return <Tree.TreeNode key={item.id} title={item.__title} disabled={item.__isDisabled} />;
		});

	renderActionButtons = ({ isLoading, onAction, selectedNode }) => {
		if (!onAction) return null;
		return (
			<Button.Group>
				{!onAction['删除'] ? null : !!selectedNode['id'] ? (
					<Popconfirm title={`是否确认要删除选中的节点吗？`} okText="是" onConfirm={onAction['删除']} cancelText="否">
						<Tooltip placement="top" title="删除">
							<Button size="small" icon="delete" />
						</Tooltip>
					</Popconfirm>
				) : (
					<Tooltip placement="top" title="删除">
						<Button size="small" disabled={true} icon="delete" />
					</Tooltip>
				)}
				{!onAction['新增'] ? null : (
					<Tooltip placement="bottom" title="新增">
						<Button size="small" onClick={onAction['新增']} icon="file-add" />
					</Tooltip>
				)}
				{!onAction['重命名'] ? null : (
					<Tooltip placement="bottom" title="重命名">
						<Button size="small" disabled={!selectedNode['id']} onClick={onAction['重命名']} icon="form" />
					</Tooltip>
				)}
				{!onAction['刷新'] ? null : (
					<Tooltip placement="bottom" title="刷新">
						<Button
							size="small"
							loading={isLoading}
							disabled={isLoading}
							onClick={onAction['刷新']}
							icon="reload"
						/>
					</Tooltip>
				)}
				{!onAction['导入'] ? null : (
					<Upload
						accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
						actions={null}
						showUploadList={false}
						onChange={(context) => console.log('<Upload> onChange: ', context)}
						customRequest={(context) => console.log('<Upload> customRequest: ', context)}
						beforeUpload={onAction['导入']}
					>
						<Tooltip placement="bottom" title="导入">
							<Button size="small" icon="upload" />
						</Tooltip>
					</Upload>
				)}
			</Button.Group>
		);
	};

	render() {
		const { treeRoot: { children } } = this.props;
		return (
			<Fragment>
				<Card className="Tree-Plus" title={this.renderActionButtons(this.props)} size="small">
					<Tree
						showLine
						draggable={true}
						className="draggable-tree"
						onDrop={this.dropHandler}
						onSelect={this.selectHandler}
						// onDragEnter={this.dragEnterHandler}
						// onCheck={this.checkHandler}
						// onRightClick={this.onRightClick}
						// onBlur={this.clearNodeTreeRightClickMenu}
						// defaultExpandedKeys={this.state.expandedKeys}
					>
						{this.renderTreeNodes(children || [])}
					</Tree>
				</Card>
			</Fragment>
		);
	}
}

/**

import React, { Fragment } from 'react';
import { Tree, Menu, Card, Button, Tooltip, Icon, Popconfirm } from 'antd';
import _ from 'lodash';

const traversal = (nodes, key, callback) => {
	nodes.forEach((item, index, arr) => {
		if (item.id === key) {
			return callback(item, index, arr);
		}
		if (item.children) {
			return traversal(item.children, key, callback);
		}
	});
};

export class Catalog extends React.Component {
	state = {
		rightClickNodeTreeItem: {
			pageX: '',
			pageY: '',
			node: null
		},
		checkedKeys: []
	};

	rightClickHandler = (e) => {
		console.log({ rightClickHandler: e });
		const { nodes, onRightClick } = this.props;
		const node = _.find(nodes, { id: e.node.props.eventKey });
		if (!node) return;
		node.__isDisabled = !node.__isDisabled;
		this.forceUpdate();
		if (!!onRightClick) onRightClick(node);
	};

	onRightClick = (e) => {
		const { nodes } = this.props;

		document.addEventListener('click', (e) => {
			this.clearNodeTreeRightClickMenu();
		});

		this.setState({
			rightClickNodeTreeItem: {
				pageX: e.event.pageX,
				pageY: e.event.pageY,
				node: _.find(nodes, { id: e.node.props.eventKey })
			}
		});
	};

	checkHandler = (checkedKeys) => {
		this.setState({ checkedKeys });
	};

	selectHandler = (info) => {
		console.log({ info });
		const { nodes, onSelect } = this.props;
		if (!info || info.length === 0) {
			if (!!onSelect) onSelect(null);
			return;
		}

		let item = _.find(nodes, { id: info.slice(-1)[0] });
		if (!!item && !!onSelect) onSelect(item);
	};
	dragEnterHandler = (info) => {};
	dropHandler = (info) => {
		const { treeRoot, onDragDrop } = this.props;
		if (!treeRoot.children || treeRoot.children.length === 0) return;

		const dragKey = info.dragNode.props.eventKey;
		const dropKey = info.node.props.eventKey;
		// const dropPos = info.node.props.pos.split('-');
		// const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
		// const dragNodesKeys = info.dragNodesKeys;

		const pair = {};
		traversal(treeRoot.children, dragKey, (item, index, arr) => {
			pair.drag = item;
		});

		if (info.dropToGap) {
			traversal(treeRoot.children, dropKey, (item, index, arr) => {
				pair.peers = arr;
			});
			if (!!pair.peers) {
				if (!!pair.peers.find((target) => target.__title === pair.drag.__title)) {
					console.error('duplicated title found! Action abort!');
					return;
				}
			}
			// treeUpdateNodePath(pair.drag, _.dropRight(peers[0].path.split('.')).join('.'));
		} else {
			traversal(treeRoot.children, dropKey, (item) => {
				pair.drop = item;
			});
			if (!!pair.drop.children.find((target) => target.__title === pair.drag.__title)) {
				console.error('duplicated title found! Action abort!');
				return;
			}
			// treeUpdateNodePath(pair.drag, pair.drop.__path);
		}

		if (!!onDragDrop) onDragDrop(pair);
	};

	nodeDeleteHandler = () => {
		const { checkedKeys } = this.state;
		const { onDelete } = this.props;

		if (checkedKeys.length > 0) {
			if (!!onDelete) onDelete(checkedKeys);
		}
	};

	renderTreeNodes = (children) =>
		children.map((item) => {
			if (!!item.children && item.children.length > 0) {
				return (
					<Tree.TreeNode key={item.id} title={item.__title} disabled={item.__isDisabled}>
						{this.renderTreeNodes(item.children)}
					</Tree.TreeNode>
				);
			}
			return <Tree.TreeNode key={item.id} title={item.__title} disabled={item.__isDisabled} />;
		});

	clearNodeTreeRightClickMenu = () => {
		this.setState({
			rightClickNodeTreeItem: {
				pageX: '',
				pageY: '',
				node: null
			}
		});
	};

	renderNodeTreeRightClickMenu = () => {
		const { rightClickMenus, onRightMenuClick } = this.props;
		const { pageX, pageY, node } = { ...this.state.rightClickNodeTreeItem };

		const tmpStyle = {
			boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`,
			zIndex: 10,
			position: 'absolute',
			left: `${pageX - 250}px`,
			top: `${pageY - 102}px`
		};
		const menu = (
			<div style={tmpStyle} className="self-right-menu">
				<Menu onClick={(e) => onRightMenuClick(e, node)}>
					{!!rightClickMenus &&
						rightClickMenus.map((value) => {
							return <Menu.Item key={value.key}>{value.name}</Menu.Item>;
						})}
				</Menu>
			</div>
		);
		return !!rightClickMenus ? menu : '';
	};

	renderActionButtons = () => {
		const { checkedKeys } = this.state;
		return (
			<Button.Group>
				{!!checkedKeys && checkedKeys.length > 0 ? (
					<Popconfirm title={`是否确认要删除选中的节点吗？`} okText="是" onConfirm={this.nodeDeleteHandler} cancelText="否">
						<Tooltip placement="bottom" title="删除">
							<Button size="small">
								<Icon type="delete" />
							</Button>
						</Tooltip>
					</Popconfirm>
				) : (
					<Tooltip placement="bottom" title="删除">
						<Button size="small" disabled={true}>
							<Icon type="delete" />
						</Button>
					</Tooltip>
				)}
			</Button.Group>
		);
	};

	render() {
		const { mode, treeRoot: { children } } = this.props;

		return (
			<Fragment>
				<Card
					title={this.renderActionButtons()}
					size="small"
					style={{ marginRight: 20, minWidth: 150, minHeight: 600 }}
				>
					{this.renderNodeTreeRightClickMenu()}
					<Tree
						checkable
						showLine
						className="draggable-tree"
						onBlur={this.clearNodeTreeRightClickMenu}
						// defaultExpandedKeys={this.state.expandedKeys}
						onRightClick={this.onRightClick}
						onCheck={this.checkHandler}
						onSelect={this.selectHandler}
						onDragEnter={this.dragEnterHandler}
						onDrop={this.dropHandler}
						draggable={mode === 'edit'}
					>
						{this.renderTreeNodes(children || [])}
					</Tree>
				</Card>
			</Fragment>
		);
	}
}

 */
