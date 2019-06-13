import React, { Component } from 'react';
import { Affix, Row, Col } from 'antd';
import HomeNav from './HomeNav';
import HomeSecondNav from './HomeSecondNav';
import HomeDetails from './HomeDetails';
import SideNav from './sideNav';
import { getHome } from '../Api/getHomeData';
import './home.less';

class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {
            top: 60,
            tags: [],
            goodAuthor: [],
            recommendBooks: [],
            linkList: []
        };
    }

    componentDidMount() {
        getHome()
            .then((res) => {
                this.setState({
                    tags: res.tags,
                    goodAuthor: res.goodAuthor,
                    recommendBooks: res.recommendBooks,
                    linkList: res.linkList
                });
            })
            .catch((err) => {
                console.log(err);
            });
    }

    render() {
        let { match } = this.props;
        const tagType = 'recommended';
        return (
            <div className="home-container">
                <Affix offsetTop={this.state.top}>
                    <div className="home-nav">
                        <nav>
                            <HomeNav tags={this.state.tags} match={match} />
                            <a href="/">标签管理</a>
                        </nav>
                    </div>
                </Affix>
                <div className="ct marginTop20">
                    <Row gutter={14}>
                        <Col className="gutter-row" span={18}>
                            {/* <HomeSecondNav /> */}
                            <HomeDetails tag={tagType} />
                            {/*   <Route
                                exact
                                path={match.url}
                                render={(props) => (
                                    <div>
                                        <HomeDetails tag={tagType} />
                                    </div>
                                )}
                            />
                            <Route
                                path={`/timeline/:tagType`}
                                render={(props) => (
                                    <div>
                                        <HomeDetails tag={props.match.params.tagType} />
                                    </div>
                                )}
                            /> */}
                        </Col>
                        <Col className="gutter-row" span={6}>
                            <SideNav
                                goodAuthor={this.state.goodAuthor}
                                recommendBooks={this.state.recommendBooks}
                                linkList={this.state.linkList}
                            />
                        </Col>
                    </Row>
                </div>
            </div>
        );
    }
}

export default Home;
