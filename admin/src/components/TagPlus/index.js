import React, {Fragment}    from 'react';
import { Tag, Input, Button, Tooltip, Icon, Divider, message } from 'antd';

export default class TagPlus extends React.Component {
    constructor(props) {
        super();
        this.state = {
            tags            : [],
            isNewTagInputVisible: false,
            newTagInputValue: '',
        }
    }
    initialState = (props) => {
        this.setState({ tags: props.tags || [] });
    }
    componentDidMount () {
        this.initialState(this.props);
    }
    componentWillReceiveProps(nextProps) {
        this.initialState(nextProps);
    }

    saveInputRef = input => this.input = input
    onCreateNewClick = () => { 
        this.setState(
            { isNewTagInputVisible: true }, 
            () => this.input.focus()
        ); 
    }
    onInputChange = (e) => {
        this.setState({ newTagInputValue: e.target.value });
    }
    onInputConfirm = () => {
        let localtags = this.state.tags;
        const input = this.state.newTagInputValue;
        if ((!input) || (input.length <= 0)) {
            message.error('标签不能为空！');
            this.setState({
                isNewTagInputVisible: false
            });
            return;
        }
        // else
        if (localtags.indexOf(input) >= 0) {
            // console.log('duplicate tag');
            message.error('和已有标签内容重复！');
            return;
        }
        // else
        this.setState({
            tags: [...localtags, input],
            isNewTagInputVisible: false,
            newTagInputValue: ''
        });
    }
    handleTagCloseClick = (value) => () => {
        this.setState({ tags: this.state.tags.filter(tag => tag !== value) });
    }

    toSave = () => {
        const { onSave } = this.props;
        if (!!onSave) onSave(this.state);
    }

    renderShortTag = (props) => (
        <Tag {...props} afterClose={this.handleTagCloseClick(props.tag)}>
            {props.tag}
        </Tag>
    )
    renderLongTag = (props) => (
        <Tooltip {...props}>
            { this.renderShortTag(props) }
        </Tooltip>
    )
    render() {
        const { mode, tags, isNewTagInputVisible, newTagInputValue } = this.state;
        const { onSave } = this.props;
        const reserved = this.props.reserved || -1;

        return (
        <Fragment>
            { !onSave ? null :
                <div>
                    <Button type='primary' onClick={ this.toSave } >保存</Button>
                    <Divider />
                </div>
            }

            {tags.map((tag, index) => {
                const isLongTag = tag.length > 20;
                const props = {
                    key: tag,
                    closable: (index > reserved),
                    tag: isLongTag ? tag.slice(0, 20) : tag
                }
                if (isLongTag) return this.renderLongTag(props);
                else return this.renderShortTag(props);
            })}

            { isNewTagInputVisible ?
            <Input type="text" size="small" style={{ width: 78 }}
                ref={this.saveInputRef}
                value={newTagInputValue}
                onChange={this.onInputChange}
                onBlur={this.onInputConfirm}
                onPressEnter={this.onInputConfirm}
            />
            :
            <Tag onClick={this.onCreateNewClick} style={{ background: '#fff', borderStyle: 'dashed' }} >
                <Icon type="plus" /> 新增标签
            </Tag>
            }
        </Fragment>
        );
    }
}
