import React from 'react';
import moment from 'moment';
import { lowerCase } from 'lodash';
import { Input, Layout, Row, Col, Tabs, List, Icon } from 'antd';
import Link from 'umi/link';
import { connect } from 'dva';

import styles from './index.css';

const { Content } = Layout;
const { TabPane } = Tabs;
const Search = Input.Search;

moment.locale('zh-CN');

const IconText = ({ type, text }) => (
  <span>
    <Icon type={type} style={{ marginRight: 8 }} />
    {text}
  </span>
);

@connect(({ search, routing, loading }) => ({
  ...search,
  query: routing.location.query,
  loading: loading.models.search,
}))
export default class extends React.Component {
  componentDidMount() {
    this.onSearch(this.props.query.keyword, this.props.page);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.query.keyword !== this.props.query.keyword) {
      this.setState((state) => ({
        ...state,
        keyword: nextProps.query.keyword,
      }));

      this.onSearch(nextProps.query.keyword, nextProps.page);
    }
  }

  getLink = (category, id) => {
    return `/studio/contentdetail/${category}/${id}`;
  };

  getFileType = (extName) => {
    if (['.png', '.jpg', '.jpeg', '.bmp', '.gif'].includes(extName)) {
      return <IconText type="file-image" text="图片" />;
    }
    if (['.doc', '.docx'].includes(extName)) {
      return <IconText type="file-word" text="Word" />;
    }
    if (['.xls', '.xlsx'].includes(extName)) {
      return <IconText type="file-excel" text="Excel" />;
    }
    if (['.ppt'].includes(extName)) {
      return <IconText type="file-ppt" text="PPT" />;
    }
    if (['.pdf'].includes(extName)) {
      return <IconText type="file-pdf" text="PDF" />;
    }
    if (['.zip'].includes(extName)) {
      return <IconText type="file-zip" text="ZIP" />;
    }
    if (['.txt'].includes(extName)) {
      return <IconText type="file-text" text="文本" />;
    }
    if (['.avi', '.mov', '.rmvb', '.rm', '.flv', '.mp4', '.3gp'].includes(extName)) {
      return <IconText type="video-camera" text="视频" />;
    }
    if (
      [
        '.cd',
        '.ogg',
        '.mp3',
        '.asf',
        '.wma',
        '.wav',
        '.mp3pro',
        '.rm',
        '.real',
        '.ape',
        '.module',
        '.midi',
        '.vqf',
      ].includes(extName)
    ) {
      return <IconText type="audio" text="音频" />;
    }

    return <Icon type="file-unknown" text="其他文件" />;
  };

  renderList = () => {
    const {
      data: { hits, total },
      consuming,
      page,
      pageSize,
    } = this.props;

    return (
      <List
        itemLayout="vertical"
        size="large"
        pagination={{
          onChange: (page) => {
            const { keyword } = this.props;

            this.onSearch(keyword, page);
          },
          defaultCurrent: 1,
          current: page,
          pageSize: pageSize,
          total: total,
          hideOnSinglePage: true,
        }}
        dataSource={hits}
        footer={
          <div>
            <b>共{total || 0}条记录</b> 搜索耗时: {consuming || 0}ms
          </div>
        }
        renderItem={(item) => (
          <List.Item
            key={item._source.title}
            actions={[
              <IconText type="eye" text={item._source.views || 0} />,
              !!item._source.author ? <IconText type="user" text={item._source.author} /> : '',
              // <IconText type="like-o" text="156" />,
              // <IconText type="message" text="2" />,
            ]}
            extra={
              !!item._source.thumbnail ? (
                <img width={272} alt="logo" src={item._source.thumbnail} />
              ) : (
                ''
              )
            }
          >
            <List.Item.Meta
              title={
                <Link to={this.getLink(item._source.category, item._id)}>{item._source.title}</Link>
              }
              description={item._source.summary}
            />
          </List.Item>
        )}
      />
    );
  };

  renderMediaList = () => {
    const {
      data: { hits, total },
      consuming,
      page,
      pageSize,
    } = this.props;

    return (
      <List
        itemLayout="vertical"
        size="large"
        pagination={{
          onChange: (page) => {
            const { keyword } = this.props;

            this.onSearch(keyword, page);
          },
          defaultCurrent: 1,
          current: page,
          pageSize: pageSize,
          total: total,
          hideOnSinglePage: true,
        }}
        dataSource={hits}
        footer={
          <div>
            <b>共{total || 0}条记录</b> 搜索耗时: {consuming || 0}ms
          </div>
        }
        renderItem={(item) => (
          <List.Item
            key={item._source.path}
            actions={[
              item._source.type === 'file' ? (
                this.getFileType(item._source.extName)
              ) : (
                <IconText type="folder" text="文件夹" />
              ),
              !item._source.stat
                ? ''
                : `大小：${(item._source.stat.size / 1024 / 1024).toFixed(4)}MB`,
              !item._source.stat
                ? ''
                : `创建时间：${moment(item._source.stat.birthtimeMs).format(
                    'YYYY-MM-DD HH:mm:ss'
                  )}`,
              !item._source.stat ? '' : `最后访问：${moment(item._source.stat.atimeMs).fromNow()}`,
            ]}
            extra={''}
          >
            <List.Item.Meta
              title={<a>{item._source.baseName}</a>}
              description={item._source.path}
            />
          </List.Item>
        )}
      />
    );
  };

  onSearch = (keyword, page) => {
    const { dispatch } = this.props;

    dispatch({
      type: 'search/search',
      payload: {
        keyword,
        page: page || 1,
      },
    });
  };

  render() {
    const { keyword, tabkey } = this.props;

    return (
      <Layout style={{ minHeight: 300 }}>
        <Content className={styles.normal}>
          <Row className="filter-row" gutter={6}>
            <Col className="gutter-row" span={10} offset={7}>
              <Search
                placeholder="请输入搜索关键词"
                ref={(e) => (this.searchInput = e)}
                defaultValue={keyword}
                onSearch={(val) => this.onSearch(val)}
                enterButton
              />
            </Col>
          </Row>
          <Row className="filter-row" gutter={6} style={{ marginTop: 30 }}>
            <Col className="gutter-row">
              <Tabs
                defaultActiveKey={tabkey}
                onChange={(activeKey) =>
                  this.props.dispatch({
                    type: 'search/changeTabkey',
                    payload: {
                      tabkey: activeKey,
                    },
                  })
                }
              >
                <TabPane tab="内容" key="contents">
                  {this.renderList()}
                </TabPane>
                <TabPane tab="文件" key="uploads">
                  {this.renderMediaList()}
                </TabPane>
              </Tabs>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }
}
