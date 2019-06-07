import React, { PureComponent } from 'react';
import { Spin, Tag, Menu, Icon, Avatar, Tooltip } from 'antd';
import moment from 'moment';
import Router from 'umi/router';
import groupBy from 'lodash/groupBy';
import NoticeIcon from '../NoticeIcon';
import HeaderSearch from '../HeaderSearch';
import HeaderDropdown from '../HeaderDropdown';
import styles from './index.less';

export default class GlobalHeaderRight extends PureComponent {
  getNoticeData() {
    const { notices = [] } = this.props;

    if (notices.length === 0) {
      return {};
    }
    const newNotices = notices.map((notice) => {
      const newNotice = { ...notice };
      if (newNotice.datetime) {
        newNotice.datetime = moment(notice.datetime).fromNow();
      }
      if (newNotice.id) {
        newNotice.key = newNotice.id;
      }
      if (newNotice.extra && newNotice.status) {
        const color = {
          todo: '',
          processing: 'blue',
          urgent: 'red',
          doing: 'gold',
        }[newNotice.status];
        newNotice.extra = (
          <Tag color={color} style={{ marginRight: 0 }}>
            {newNotice.extra}
          </Tag>
        );
      }
      return newNotice;
    });

    return groupBy(newNotices, 'type');
  }

  getUnreadData = (noticeData) => {
    const unreadMsg = {
      count: 0,
    };
    Object.entries(noticeData).forEach(([key, value]) => {
      if (!unreadMsg[key]) {
        unreadMsg[key] = 0;
      }
      if (Array.isArray(value)) {
        unreadMsg[key] = value.filter((item) => !item.read).length;
      }

      unreadMsg.count += unreadMsg[key];
    });
    return unreadMsg;
  };

  changeReadState = (clickedItem) => {
    const { id } = clickedItem;
    const { dispatch } = this.props;
    dispatch({
      type: 'global/changeNoticeReadState',
      payload: id,
    });
  };

  fetchMoreNotices = (tabProps) => {
    const { list, name } = tabProps;
    const { dispatch, notices = [] } = this.props;
    const lastItemId = notices[notices.length - 1].id;
    dispatch({
      type: 'global/fetchMoreNotices',
      payload: {
        lastItemId,
        type: name,
        offset: list.length,
      },
    });
  };

  render() {
    const {
      currentUser,
      fetchingMoreNotices,
      fetchingNotices,
      loadedAllNotices,
      onNoticeVisibleChange,
      onMenuClick,
      onNoticeClear,
      skeletonCount,
      theme,
    } = this.props;
    const menu = (
      <Menu className={styles.menu} selectedKeys={[]} onClick={onMenuClick}>
        {/* <Menu.Item key="userCenter">
					<Icon type="user" />
					个人中心
				</Menu.Item> */}
        <Menu.Item key="userinfo">
          <Icon type="setting" />
          账户设置
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="logout">
          <Icon type="logout" />
          退出
        </Menu.Item>
      </Menu>
    );
    const loadMoreProps = {
      skeletonCount,
      loadedAll: loadedAllNotices,
      loading: fetchingMoreNotices,
    };
    const noticeData = this.getNoticeData();
    const unreadMsg = this.getUnreadData(noticeData);
    let className = styles.right;
    if (theme === 'dark') {
      className = `${styles.right}  ${styles.dark}`;
    }

    return (
      <div className={className}>
        <HeaderSearch
          className={`${styles.action} ${styles.search}`}
          placeholder={'站内搜索'}
          // dataSource={['提示1', '提示2', '提示3']}
          onSearch={(value) => {
            // console.log('input', value); // eslint-disable-line
          }}
          onPressEnter={(value) => {
            // console.log('enter', value); // eslint-disable-line
            Router.push({ pathname: '/studio/search', query: { keyword: value } });
          }}
        />
        <Tooltip title={'帮助'}>
          <a
            target="_blank"
            href="javascript:;"
            rel="noopener noreferrer"
            className={styles.action}
          >
            <Icon type="question-circle-o" />
          </a>
        </Tooltip>
        {/*
				<NoticeIcon
					className={styles.action}
					count={unreadMsg.count}
					onItemClick={(item, tabProps) => {
						console.log(item, tabProps); // eslint-disable-line
						this.changeReadState(item, tabProps);
					}}
					locale={{
						emptyText: '暂无',
						clear: '清空',
						loadedAll: '加载完毕',
						loadMore: '加载更多'
					}}
					onClear={onNoticeClear}
					onLoadMore={this.fetchMoreNotices}
					onPopupVisibleChange={onNoticeVisibleChange}
					loading={fetchingNotices}
					clearClose
				>
					<NoticeIcon.Tab
						count={unreadMsg.notification}
						list={noticeData.notification}
						title={'通知'}
						name="notification"
						emptyText={'暂无通知'}
						emptyImage="https://gw.alipayobjects.com/zos/rmsportal/wAhyIChODzsoKIOBHcBk.svg"
						{...loadMoreProps}
					/>
					<NoticeIcon.Tab
						count={unreadMsg.message}
						list={noticeData.message}
						title={'消息'}
						name="message"
						emptyText={'暂无消息'}
						emptyImage="https://gw.alipayobjects.com/zos/rmsportal/sAuJeJzSKbUmHfBQRzmZ.svg"
						{...loadMoreProps}
					/>
					<NoticeIcon.Tab
						count={unreadMsg.event}
						list={noticeData.event}
						title={'待办'}
						name="event"
						emptyText={'暂无待办'}
						emptyImage="https://gw.alipayobjects.com/zos/rmsportal/HsIsxMZiWKrNUavQUXqx.svg"
						{...loadMoreProps}
					/>
				</NoticeIcon>*/}
        {true ? (
          <HeaderDropdown overlay={menu}>
            <span className={`${styles.action} ${styles.account}`}>
              {!currentUser.avatar ? (
                ''
              ) : (
                <Avatar
                  size="small"
                  className={styles.avatar}
                  src={currentUser.avatarPath}
                  alt="avatar"
                />
              )}
              <span className={styles.name}>
                {currentUser.nickname ? currentUser.nickname : currentUser.account} ，您好！
              </span>
            </span>
          </HeaderDropdown>
        ) : (
          <Spin size="small" style={{ marginLeft: 8, marginRight: 8 }} />
        )}
      </div>
    );
  }
}
