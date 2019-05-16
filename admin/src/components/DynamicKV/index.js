import React, {Fragment} from 'react';
import moment from 'moment';
import { Row, Col, Input, Icon, Button } from 'antd';
import { getUUID } from '../../utils/utils';

const KVItem = ({kvItem, onRemove, onKVChange}) => (
    <Fragment>
        <Row>
            <Col span={2}>
                <Icon type="minus-circle-o" onClick={onRemove} />
            </Col>
            <Col span={6} offset={1}>
                <Input placeholder="属性" onChange={onKVChange('key')}
                    value={kvItem.key||''}
                    disabled={kvItem.isReserved}
                    // onKeyPress={e => keypressHandler(e,kvItem,'key')}
                />
            </Col>
            <Col span={14} offset={1}>
                <Input placeholder="内容" onChange={onKVChange('value')}
                    value={kvItem.value||''}                    
                    // onKeyPress={e => keypressHandler(e, kvItem,'value')}
                />
            </Col>
        </Row>
    </Fragment>
)

export default class DynamicKV extends React.PureComponent{
    constructor(props){
        super(props);
        this.state={
            values:[]
        }
    }
    componentDidMount(){
        const {ref} = this.props;
        if (!!ref) ref(this);
        this.initalState(this.props);
    }
    componentWillReceiveProps(nextProps) {
        this.initalState(nextProps);
    }
    initalState = (props)=>{
        const { initialValue } = props;
        if (!initialValue) {
            this.setState({values: []})
            return;
        }
        const reservedkeys = props.reservedKeys || [];
        this.setState({
            values: Object.keys(initialValue).map((key)=>(
                {
                    id          : getUUID(),
                    isReserved  : ( reservedkeys.indexOf(key) >= 0 ),
                    key         : key,
                    value       : initialValue[key] || null
                }
            ))
        })
    }

    toCreateNewRow =()=>{
        this.setState({ 
            values: [
                ...this.state.values, 
                {
                    id          : getUUID(),
                    isReserved  : false,
                    key         : "",
                    value       : ""
                }
            ] });
    }
    toRemove = (item) => () => {
        this.setState({ values : this.state.values.filter(kv => kv.id !== item.id) });
    };
    onChange = (item) => (prop) => (e) => {
        if (!item || !prop) return;
        item[prop] = e.target.value;
        this.setState({ values: [...this.state.values] });
    };
    // onKeyPress(e, key) {
    //     if (e.key === 'Enter') {  }
    // };
    render(){
        const { onSave } = this.props;
        return(
            <Fragment>
                { !onSave ? null :
                    <Button type="primary" onClick={onSave}>保存</Button>
                }
                {this.state.values.map((item) => (
                    <KVItem key={item.id} 
                        kvItem={item} 
                        onRemove={this.toRemove(item)} 
                        onKVChange={this.onChange(item)} 
                    />
                ))}
                <Button type="dashed" icon="plus" style={{ width: '100%', marginTop: 16, marginBottom: 8 }}
                    onClick={this.toCreateNewRow}
                > 新增 </Button>
            </Fragment>
        );
    }
}
