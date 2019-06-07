import React from 'react';
import { Input, Layout, Row, Col, Tabs, List, Icon } from 'antd';
import Link from 'umi/link';
import { connect } from 'dva';

import styles from './index.css';

const { Content } = Layout;
const { TabPane } = Tabs;
const Search = Input.Search;

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
    const { keyword } = this.props;

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
              <Tabs defaultActiveKey="contents">
                <TabPane tab="内容搜索" key="contents">
                  {this.renderList()}
                </TabPane>
              </Tabs>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }
}
