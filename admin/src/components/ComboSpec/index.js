import React, { Fragment } from 'react';
import _ from 'lodash';
import {
    Button, Input, Table, 
    Divider, Popconfirm,
    message,
} from 'antd';
import DynamicKV from '../DynamicKV';
import TableInstant from '../TableInstant';

export default class ComboSpec extends React.Component {
   	instance = {};
	toGetInstance = (name) => (ins) => { this.instance[name] = ins; }

    constructor(props) {
        super();
        this.state = {
            groupInfo: null
        }
    }
    componentDidMount(){ this.initialState(this.props); }
    componentWillReceiveProps(newProps) { }
    initialState(props){ }

    toSave = () => {
        const { subInfoColProps, onSave } = this.props;

        if (!this.instance['GROUP_INFO']) return;
        // console.log(this.instance['GROUP_INFO'].state);

        const groupInfo = this.instance['GROUP_INFO'].state.localDataSource;
        const subInfo = {};

        this.instance['GROUP_INFO'].state.localDataSource.forEach((group) => {
            if (!this.instance[group.name]) return;
            if (!subInfoColProps) {
                subInfo[group.name] = this.instance[group.name].state.values.reduce((sum, curr) => {
                    sum[curr.key] = curr.value;
                    return sum;
                }, {});
            }
            else {
                subInfo[group.name] = this.instance[group.name].state.localDataSource;
            }
        });

        // console.log({groupInfo, subInfo});
        if (!!onSave) onSave({groupInfo, subInfo});
    }

    onGroupUpdated = () => {
        if (!this.instance['GROUP_INFO']) return;
        this.setState({
            groupInfo: this.instance['GROUP_INFO'].state.localDataSource
        })
    }
    render() {
        const { groupInfoColProps, subInfoColProps } = this.props;
        const specInfo = this.props.specInfo || {};

        const { groupInfo } = this.state;
        const groupinfo = groupInfo || specInfo.groupInfo;
        const subinfo = specInfo.subInfo || {};

        return (
            <Fragment>
                <Button onClick={this.toSave} type='primary'>保存</Button>
                <Divider />
                <TableInstant
                    ref={this.toGetInstance('GROUP_INFO')}
                    onUpdated={this.onGroupUpdated}
                    columnsProp={groupInfoColProps} 
                    defaultRowObj={{ }}
                    dataSource={groupinfo} 
                />
                {   !groupinfo ? null :
                    groupinfo.map((group) => (
                    <div key={group.name} >
                        <h3>{`${group.name}`}</h3>
                        <Divider />
                        {   !subInfoColProps ? 
                            <DynamicKV 
                                initialValue={subinfo[group.name]} 
                                ref={this.toGetInstance(group.name)} 
                            />
                            :
                            <TableInstant
                                ref={this.toGetInstance(group.name)} 
                                columnsProp={subInfoColProps} 
                                dataSource={subinfo[group.name]} 
                            />
                        }
                        <Divider />
                    </div>
                ))
                }
            </Fragment>
        )
    }
}
