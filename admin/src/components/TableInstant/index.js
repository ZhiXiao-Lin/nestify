import React, { Component, Fragment }   from 'react';
import _                                from 'lodash';
import {
    Button, Input, Table, 
    Divider, Popconfirm,
    message,
}                                       from 'antd';
import { getUUID }                      from '../../utils/utils';

const gRowStatus = {
    new     : 'new',
    saved   : 'saved',
    editing : 'editing',
}
export default class TableInstant extends Component {
    constructor(props) {
        super();
        this.state = {
            localDataSource :[],
            backupDataSource:[],
        }
    }
    componentDidMount(){ this.initialState(this.props); }
    componentWillReceiveProps(newProps) { 
        if (_.isEqual(this.props, newProps)) return;
        this.initialState(newProps); 
    }
    initialState(props){
        const { getInstance, dataSource } = props;
        const datasource = dataSource || [];
        this.setState({
            localDataSource: datasource.map((item) => ( {
                ...item,
                __key__     : item.__key__ || getUUID(),
                __status__  : gRowStatus.saved,
            }) )
        });
    }

    toCreateNew =(e)=>{
        const { defaultRowObj } = this.props;
        const newrow = Object.assign(
            {},
            defaultRowObj,
            {
                __key__     : getUUID(),
                __status__  : gRowStatus.new,
            }
        );
        this.setState({ 
            localDataSource : [ ...this.state.localDataSource, newrow ],
        });
    };
    toEnableEdit = (e, key) => {
        e.preventDefault();
        
        const row = _.find(this.state.localDataSource, {__key__: key });
        if (!row) return;

        row.__status__ = 'editing';
        this.setState({ 
            localDataSource : [...this.state.localDataSource],
            backupDataSource: [...this.state.backupDataSource, {...row}]
        });
    };
    toCancelEdit(e, key) {
        e.preventDefault();

        const newrow = _.find(this.state.localDataSource, {__key__: key });
        const origin = _.find(this.state.backupDataSource, {__key__: key });
        if (!newrow || !origin) return;

        Object.assign(newrow, origin, { __status__: 'saved'});
        this.setState({ 
            localDataSource : [...this.state.localDataSource],
            backupDataSource: this.state.backupDataSource.filter(item => item.__key__ !== key)
        });
    };
    toRemoveRow(key) {
        const { onUpdated } = this.props;
        this.setState({ 
            localDataSource : this.state.localDataSource.filter(item => item.__key__ !== key),
            backupDataSource: this.state.backupDataSource.filter(item => item.__key__ !== key) 
        }, () => {
            if (!!onUpdated) onUpdated();
        });
    };
    toSaveEdit(e, key) {
        e.persist();

        const row = _.find(this.state.localDataSource, {__key__: key });
        if (!row) return;

        const { onUpdated } = this.props;
        row.__status__ = 'saved';
        this.setState({ 
            localDataSource : [...this.state.localDataSource],
            backupDataSource: this.state.backupDataSource.filter(item => item.__key__ !== key) 
        }, () => {
            if (!!onUpdated) onUpdated();
        });
    };

    onKeyPress(e, key) {
       if (e.key === 'Enter') {
            this.toSaveEdit(e, key);
        }
    };
    onFieldChange(e, key, field) {
        const row = _.find(this.state.localDataSource, {__key__: key });
        if (!row) return;
        row[field] = e.target.value;
        this.setState({ localDataSource: [...this.state.localDataSource] });
    };

    render(){
        const { columnsProp, onSave, disabled } = this.props;
        if (!columnsProp) {
            message.error("属性缺失")
            return null;
        }
        let tablecolumns = columnsProp.map(prop => {
            return {
                title       : prop.title,
                dataIndex   : prop.key,
                key         : prop.key,
                render: (text, record) => {
                    if (record.__status__ !== gRowStatus.saved) {
                        return (
                            <Input key={record.__key__} autoFocus
                                value={text}
                                onFocus={this.inputFocus}
                                onBlur={this.inputBlur}
                                onChange={e => this.onFieldChange(e, record.__key__, prop.key)}
                                onKeyPress={e => this.onKeyPress(e, record.__key__, prop.key)}
                                placeholder= {prop.title}
                            />
                        );
                    }
                    return text;
                },
            }
        });

        const handleColumn = {
            key: '__action__',
            title: '操作',
            render: (text, record) => {
                switch (record.__status__) {
                case gRowStatus.new:
                    return (
                        <span>
                            <a onClick={e => this.toSaveEdit(e, record.__key__)}>添加</a>
                            <Divider type="vertical" />
                            <Popconfirm title="是否要删除此行？" okText="删除" cancelText="取消"
                                onConfirm={() => this.toRemoveRow(record.__key__)}
                            > <a>删除</a> </Popconfirm>
                        </span>
                    );
                case gRowStatus.editing:
                    return (
                        <span>
                            <a onClick={e => this.toSaveEdit(e, record.__key__)}>保存</a>
                            <Divider type="vertical" />
                            <a onClick={e => this.toCancelEdit(e, record.__key__)}>取消</a>
                        </span>
                    );
                case gRowStatus.saved:
                    return (
                        <span>
                            <a onClick={e => this.toEnableEdit(e, record.__key__)}>编辑</a>
                            <Divider type="vertical" />
                            <Popconfirm title="是否要删除此行？" okText="删除" cancelText="取消"
                                onConfirm={() => this.toRemoveRow(record.__key__)}
                            > <a>删除</a> </Popconfirm>
                        </span>
                    );
                default:
                    return null;
                }
            }
        };

        if (!!onSave || !disabled ) tablecolumns.push(handleColumn);

        return(
            <Fragment>
                { !onSave ? null :
                    <div>
                        <Button type='primary' onClick={ onSave } >保存</Button>
                        <Divider />
                    </div>
                }
                <Table rowKey='__key__' pagination={false} 
                    // loading={this.state.loading}
                    columns={tablecolumns}
                    dataSource={this.state.localDataSource}
                />
                <Button type="dashed" icon="plus" style={{ width: '100%', marginTop: 16, marginBottom: 8 }}
                    hidden={!onSave && !!disabled}
                    onClick={this.toCreateNew}
                > 新增行 </Button>
            </Fragment>
        )
    }
}
