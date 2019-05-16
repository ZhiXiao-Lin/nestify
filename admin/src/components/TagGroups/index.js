import React, {Fragment} from 'react';
import { Tag, Button } from 'antd';

export default class TagGroups extends React.PureComponent{
    constructor(props){
        super(props);
        this.state={ 
            groupsTag: {}   // { [groupName]: tag[], ... }
        } 
    }
    componentDidMount(){
        this.initalState(this.props);
    }
    componentWillReceiveProps(nextProps) {
        this.initalState(nextProps);
    }
    initalState = ({tagString}) => {
        if (!tagString) return;
        const groupsTag = {};
        tagString.split(';').forEach(element => {
            const selected = element.split(':');
            if (!groupsTag[selected[0]]) groupsTag[selected[0]] = [];
            groupsTag[selected[0]].push(selected[1]);
        });
        this.setState({groupsTag});
    }
    generateResult() {
        const groups = Object.keys(this.state.groupsTag).reduce((result, groupName) => {
            const tags = this.state.groupsTag[groupName].reduce((sum, tag) => {
                sum.push(`${groupName}:${tag}`);
                return sum;
            }, []);
            result.push(tags.join(';'));
            return result;
        }, []);
        return groups.join(';');
    }

    onTagSelectedChange = (groupName, tag) => {
        const { groupsTag } = this.state;

        groupsTag[groupName] = [tag];
        this.setState({groupsTag: {...groupsTag}});
    }

    render(){
        const { onSave, tagGroups } = this.props;
        const { groupsTag } = this.state;
        if (!tagGroups || tagGroups.length === 0) return null;
        return(
            <Fragment>
                { !onSave ? null :
                    <Button type="primary" onClick={onSave}>保存</Button>
                }
                {tagGroups.map((group) => (
                    <div key={`${group.name}`}>
                        <h6 style={{ marginRight: 8, display: 'inline' }}>{group.name}:</h6>
                        {
                            group.tags.map((tag) => (
                                <Tag.CheckableTag
                                    key={`${group.name}${tag}`}
                                    checked={groupsTag[group.name] && (groupsTag[group.name].indexOf(tag) > -1)}
                                    onChange={() => this.onTagSelectedChange(group.name, tag)}
                                >
                                    {tag}
                                </Tag.CheckableTag>
                            ))
                        }
                    </div>
                )) }
            </Fragment>
        );
    }
}
