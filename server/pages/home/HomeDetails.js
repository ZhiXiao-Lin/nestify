import React, { Component } from 'react';
import Tag from '../components/Tag';
import List from './List';
import { getArticleList } from '../Api/getHomeData';

class HomeDetails extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sortTag1: ['热门', '最新', '评论'],
            sortTag2: ['本周最热', '本月最热', '历史最热'],
            sortTagMap: {
                hot: '热门',
                latest: '最新',
                comments: '评论',
                weekHot: '本周最热',
                mounthHot: '本月最热',
                historyHot: '历史最热'
            },
            selectedTag: [],
            articleList: []
        };
        this.getTags = this.getTags.bind(this);
    }

    componentDidMount() {
        console.log('初始化加载内容', this.props.tag);
        getArticleList().then((res) => {
            this.setState({
                articleList: res.articleList
            });
        });
    }

    componentDidUpdate() {
        console.log('更新内容', this.state.selectedTag);
        return true;
    }

    handelSelectedTag(val) {
        //console.log(val);
        this.getTags(val);
        //根据不同tags修改数组articleList内容
    }

    //获取排序方式tag集合
    getTags(arr) {
        let result = [];
        let sortTagMap = this.state.sortTagMap;
        let obj = Object.keys(sortTagMap);
        for (let i = 0; i < obj.length; i++) {
            if (arr.indexOf(sortTagMap[obj[i]]) > -1) {
                result.push(obj[i]);
            }
        }
        this.setState({
            selectedTag: [...new Set(result)]
        });
    }

    //点赞
    editStar = (id) => {
        console.log('点赞', id);
    };

    //评论
    lookComment = (id) => {
        console.log('评论', id);
        window.location.href = `/post/:${id}`; //window.location.href跳转
    };

    //收藏
    collectArticle = (id) => {
        console.log('收藏', id);
    };

    render() {
        return (
            <div className="article-container">
                <section className="sort-tag">
                    <Tag
                        tagsFromServer={this.state.sortTag1}
                        selectedTags={this.handelSelectedTag.bind(this)}
                    />
                    <Tag
                        tagsFromServer={this.state.sortTag2}
                        selectedTags={this.handelSelectedTag.bind(this)}
                    />
                </section>
                <List
                    data={this.state.articleList}
                    editStar={this.editStar.bind(this)}
                    lookComment={this.lookComment.bind(this)}
                    collectArticle={this.collectArticle.bind(this)}
                />
            </div>
        );
    }
}

export default HomeDetails;
