// encoding UTF-8

import _                                from 'lodash';

/**
 * Tree Node structure: {
 * 
 *    id            : passed from outside of this component
 *    key           : copy of id (to adapt to Ant Design Tree)
 *    children      : nodes references of children
 *    __path        : passed from outside of this component
 *    __title       : last segment of path
 *    __level       : how many segment the node path has
 *    __isDisabled  : if the node is disabled
 *
 * }
 */

/**
 *
 * @param {*} nodesArray  : array of all nodes
 * @param {*} treeRoot    : node of tree root
 * @param {*} orphanList  : array of nodes references which are not belongs to the tree
 *
 * Attention              : this is not a pure function!!!
 *                        : objects in the array my be modified (add new properties of 'key', 'children', '__title')
 */
export function treeInitial (nodesArray, pathName, treeRoot, orphanList) {

    treeRoot.children = [];
    orphanList.length = 0;

    if (!nodesArray || nodesArray.length === 0) return;

    let tmparr = [];
    nodesArray.forEach((node) => {
        node.__path       = node[pathName] || '';
        tmparr            = node.__path.split('.');
        node.__title      = tmparr.slice(-1)[0];
        node.__level      = tmparr.length;
        node.__isDisabled = !!node.__isDisabled;
        node.children     = [];
    });
  
    tmparr = _.sortBy(nodesArray, ['__level']);
    tmparr.forEach((node) => {
        if (!treePushNode(treeRoot, node)) {
            orphanList.push(node);
        }
    });
}


/**
 * @param {*} node  : node 节点（一棵树或子树的根节点）
 * @param {*} child ：新的 child 节点（另一棵树或子树的根节点）
 * 
 * function         : 尝试将 child 节点加入到 node 树中
 * 
 * return           : bool
 *  @ true          : 成功将 child 加入到了 node 的节点或子孙节点上
 *  @ false         : 无法将 child 加入到了 node 的节点或子孙节点上
 * 
 * description      : child 能够被添加到 node 的 children 数组中的条件是：比对双方的 .__path 属性
 *                  : 1. child.__path 比 node.__path 多一级
 *                  : 2. child.__path 包含 node.__path （字符串包含，且包含的起始位置为 0 ）
 * 
 */
export function treePushNode(node, child) {
    // console.log('treePushNode: ', node, child);
    // console.log(node.__path.split('.').length, child.__path.split('.').length);
    // console.log(child.__path.indexOf(node.__path));
    if (
        (node.__level === (child.__level - 1)) &&
        (child.__path.indexOf(node.__path) === 0)
    ) {
        if (!node.children) { node.children = []; }
        node.children.push(child);
        console.log('children push');
        return true;
    }
    else if (node.children && node.children.length > 0) {
        for (let item of node.children) {
            if(treePushNode(item, child)) return true;
        }
        return false;
    }
    else { 
        return false; 
    }
    return false;
}
  
/**
 * 
 * @param {*} node        : node 节点（一棵树或子树的根节点）
 * @param {*} parentpath  : 父节点的 path 信息
 * 
 * function               : 根据传入的 parentpath，更新 node 树或子树的全部节点的 path 信息
 * 
 * return                 : null
 * 
 * description            : 1. 传入的 parentpath 有效，node.__path 更新为 parentpath 加上 自己节点的名称（path 的最后一节）的组合
 *                        : 2. 传入的 parentpath 无效，node.__path 更新为 自己节点的名称（path 的最后一节）
 *                        : 3. 递归处理全部子节点
 * 
 */
export function treeUpdateNodePath(node, parentpath) {
    const pathstr = node.__path.split('.');
    if(parentpath && (parentpath.length > 0)) node.__path = parentpath + '.' + pathstr[pathstr.length-1];
    else node.__path = pathstr[pathstr.length-1];
    node.__isChanged = true;

    if (node.children && node.children.length > 0) {
        for (let item of node.children) {
        treeUpdateNodePath(item, node.__path);
        }
    }
}
  
/**
 * 
 * @param {*} node        : node 节点（一棵树或子树的根节点）
 * @param {*} newname     : node 节点的新名称
 * 
 * function               : 根据传入的 newname，更新本 node 节点，并更新树或子树的全部节点的 path 信息
 * 
 * return                 : null
 *  
 */
export function treeRenameNode(node, newname) {
    // console.log('treePushNode: ', node, child);
    // console.log(node.__path.split('.').length, child.__path.split('.').length);
    // console.log(child.__path.indexOf(node.__path));
    const pathstr = node.__path.split('.');
    pathstr[pathstr.length-1] = newname;
    node.__path = pathstr.join('.');
    node.__isChanged = true;
  
    if (node.children && node.children.length > 0) {
        for (let item of node.children) {
            treeUpdateNodePath(item, node.__path);
        }
    }
}
  
  