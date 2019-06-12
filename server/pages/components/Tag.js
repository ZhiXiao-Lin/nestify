import React, { Component } from 'react';
import { Tag } from 'antd';

const CheckableTag = Tag.CheckableTag;

class Tags extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedTags: [],
        }
    }

    handleChange(tag, checked) {
        const { selectedTags } = this.state;
        const nextSelectedTags = checked? [...selectedTags, tag]: selectedTags.filter(t => t !== tag);
        //console.log('You are interested in: ', nextSelectedTags);
        this.props.selectedTags(nextSelectedTags);//向父组件传值
        this.setState({ selectedTags: nextSelectedTags });
    }

    render() {
        const { selectedTags } = this.state;
        const { tagsFromServer } = this.props;
        return (
            <div>
                {tagsFromServer.map(tag => (
                    <CheckableTag
                        key={tag}
                        checked={selectedTags.indexOf(tag) > -1}
                        onChange={checked => this.handleChange(tag, checked)}
                    >
                        {tag}
                    </CheckableTag>
                ))}
            </div>
        );
    }
}

export default Tags;