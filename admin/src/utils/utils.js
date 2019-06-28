import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import nzh from 'nzh/cn';
import { parse, stringify } from 'qs';
import config from '@/config';

/**
 * General functions
 */

export function delay(ms) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      resolve(null);
    }, ms)
  );
}

export function getUUID() {
  var s = [];
  var hexDigits = '0123456789abcdef';
  for (var i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = '4'; // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = '-';

  var uuid = s.join('');
  return uuid;
}

export function trimBlackList(obj, nameList) {
  if (!nameList) return;
  nameList.forEach((name) => {
    delete obj[name];
  });
}

/**
 * Common rules for this project
 */

export function validatePhonenumber(number) {
  return /^1[34578]\d{9}$/.test(number);
}

/**
 * Helpers for Ant Design
 */

export function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some((field) => fieldsError[field]);
}

export function buildCascadeOptions(items, labelName, levelName, pathName, valueNames) {
  if (!items || items.length === 0) return null;

  const localitems = _.cloneDeep(items);

  let lmin = 10000;
  let level = null;
  let children = null;
  localitems.forEach((entry) => {
    entry['label'] = entry[labelName];
    entry['value'] = valueNames.reduce(
      (sum, vn) => (!sum ? `${entry[vn].toString()}` : `${sum}:${entry[vn].toString()}`),
      ''
    );

    level = entry[levelName];
    if (lmin > level) lmin = level;
    children = _.filter(
      localitems,
      (e) => level + 1 === e[levelName] && e[pathName].indexOf(entry[pathName]) === 0
    );
    if (children.length > 0) {
      entry['children'] = children;
    }
  });

  const rootchidren = localitems.filter((entry) => entry[levelName] === lmin);
  if (!rootchidren || rootchidren.length === 0) return null;
  else return rootchidren;
}

export function cloneCascaders(source, target) {
  source.forEach((item) => {
    const newitem = {
      label: item.label,
      value: item.value,
    };

    if (!!item.children && item.children.length >= 0) {
      newitem.children = [];
      cloneCascaders(item.children, newitem.children);
    }

    target.push(newitem);
  });
}

export function findCascaderItem(cascader, value, result) {
  for (let item of cascader) {
    result.push(item.value);
    if (item.value === value) return true;

    if (!item.children || item.children.length === 0) {
      result.pop();
      continue;
    } else {
      if (findCascaderItem(item.children, value, result)) {
        return true;
      }
    }
  }
  result.length = 0;
}

export function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {
    type: mime,
  });
}

/**
 * Others from Ant Design Pro
 */

export function fixedZero(val) {
  return val * 1 < 10 ? `0${val}` : val;
}

export function getTimeDistance(type) {
  const now = new Date();
  const oneDay = 1000 * 60 * 60 * 24;

  if (type === 'today') {
    now.setHours(0);
    now.setMinutes(0);
    now.setSeconds(0);
    return [moment(now), moment(now.getTime() + (oneDay - 1000))];
  }

  if (type === 'week') {
    let day = now.getDay();
    now.setHours(0);
    now.setMinutes(0);
    now.setSeconds(0);

    if (day === 0) {
      day = 6;
    } else {
      day -= 1;
    }

    const beginTime = now.getTime() - day * oneDay;

    return [moment(beginTime), moment(beginTime + (7 * oneDay - 1000))];
  }

  if (type === 'month') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const nextDate = moment(now).add(1, 'months');
    const nextYear = nextDate.year();
    const nextMonth = nextDate.month();

    return [
      moment(`${year}-${fixedZero(month + 1)}-01 00:00:00`),
      moment(moment(`${nextYear}-${fixedZero(nextMonth + 1)}-01 00:00:00`).valueOf() - 1000),
    ];
  }

  const year = now.getFullYear();
  return [moment(`${year}-01-01 00:00:00`), moment(`${year}-12-31 23:59:59`)];
}

export function getPlainNode(nodeList, parentPath = '') {
  const arr = [];
  nodeList.forEach((node) => {
    const item = node;
    item.path = `${parentPath}/${item.path || ''}`.replace(/\/+/g, '/');
    item.exact = true;
    if (item.children && !item.component) {
      arr.push(...getPlainNode(item.children, item.path));
    } else {
      if (item.children && item.component) {
        item.exact = false;
      }
      arr.push(item);
    }
  });
  return arr;
}

export function digitUppercase(n) {
  return nzh.toMoney(n);
}

function getRelation(str1, str2) {
  if (str1 === str2) {
    console.warn('Two path are equal!'); // eslint-disable-line
  }
  const arr1 = str1.split('/');
  const arr2 = str2.split('/');
  if (arr2.every((item, index) => item === arr1[index])) {
    return 1;
  }
  if (arr1.every((item, index) => item === arr2[index])) {
    return 2;
  }
  return 3;
}

function getRenderArr(routes) {
  let renderArr = [];
  renderArr.push(routes[0]);
  for (let i = 1; i < routes.length; i += 1) {
    // 去重
    renderArr = renderArr.filter((item) => getRelation(item, routes[i]) !== 1);
    // 是否包含
    const isAdd = renderArr.every((item) => getRelation(item, routes[i]) === 3);
    if (isAdd) {
      renderArr.push(routes[i]);
    }
  }
  return renderArr;
}

/**
 * Get router routing configuration
 * { path:{name,...param}}=>Array<{name,path ...param}>
 * @param {string} path
 * @param {routerData} routerData
 */
export function getRoutes(path, routerData) {
  let routes = Object.keys(routerData).filter(
    (routePath) => routePath.indexOf(path) === 0 && routePath !== path
  );
  // Replace path to '' eg. path='user' /user/name => name
  routes = routes.map((item) => item.replace(path, ''));
  // Get the route to be rendered to remove the deep rendering
  const renderArr = getRenderArr(routes);
  // Conversion and stitching parameters
  const renderRoutes = renderArr.map((item) => {
    const exact = !routes.some((route) => route !== item && getRelation(route, item) === 1);
    return {
      exact,
      ...routerData[`${path}${item}`],
      key: `${path}${item}`,
      path: `${path}${item}`,
    };
  });
  return renderRoutes;
}

export function getPageQuery() {
  return parse(window.location.href.split('?')[1]);
}

export function getQueryPath(path = '', query = {}) {
  const search = stringify(query);
  if (search.length) {
    return `${path}?${search}`;
  }
  return path;
}

/* eslint no-useless-escape:0 */
const reg = /(((^https?:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+(?::\d+)?|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)$/;

export function isUrl(path) {
  return reg.test(path);
}

export function formatWan(val) {
  const v = val * 1;
  if (!v || Number.isNaN(v)) return '';

  let result = val;
  if (val > 10000) {
    result = Math.floor(val / 10000);
    result = (
      <span>
        {result}
        <span
          style={{
            position: 'relative',
            top: -2,
            fontSize: 14,
            fontStyle: 'normal',
            marginLeft: 2,
          }}
        >
          万
        </span>
      </span>
    );
  }
  return result;
}

// 给官方演示站点用，用于关闭真实开发环境不需要使用的特性
export function isAntdPro() {
  return window.location.hostname === 'preview.pro.ant.design';
}

export function downloadBuffer(buffer, fileName) {
  const download = document.createElement('a');
  download.href = window.URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.ms-excel' })
  );
  download.download = fileName;
  download.click();
  window.URL.revokeObjectURL(download.href);
}

export const StorageType = {
  LOCAL: 'local',
  QINIU: 'qiniu',
};

export function getFullPath(info) {
  if (!!info) {
    switch (info.storageType) {
      case StorageType.LOCAL:
        return info.path.startsWith('/') ? `${config.staticRoot}/${info.path}` : info.path;
      case StorageType.QINIU:
        return `${config.qiniu.domain}/${info.path}`;
      default:
        return info.path;
    }
  }

  return '';
}
