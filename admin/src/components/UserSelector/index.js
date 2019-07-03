import React, { Component } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'dva';
import {
    Input,
    DatePicker,
    Table,
    Layout,
    Row,
    Col,
    Form,
    Button,
    Icon,
    Divider,
    Collapse,
    TreeSelect,
    Drawer
} from 'antd';

const { Content } = Layout;
const Panel = Collapse.Panel;
const { RangePicker } = DatePicker;

const MODEL_NAME = 'users';

@connect(({ users, user, organization, loading }) => ({
    ...users,
    currentUser: user.currentUser,
    organization,
    loading: loading.models.users,
}))
@Form.create()
export default class extends Component {

    componentDidMount() {
        this.init();
        this.onReset();
        this.refresh();
    }

    init = (channel) => {
        let columns = [];
        let fields = [];
        let showQueryCondition = false;

        switch (channel) {
            default:
                columns = [
                    {
                        title: '头像',
                        dataIndex: 'avatarPath',
                        render: (val) => (!val ? null : <img style={{ width: '30px' }} src={val} />),
                    },
                    {
                        title: '昵称',
                        dataIndex: 'nickname',
                        render: (val) => {
                            const {
                                queryParams: { keyword },
                            } = this.props;

                            const reg = new RegExp(keyword, 'gi');

                            return !!keyword
                                ? val
                                    .toString()
                                    .split(reg)
                                    .map((text, i) =>
                                        i > 0
                                            ? [
                                                <span key={i} col={i} style={{ color: 'red' }}>
                                                    <b>{val.toString().match(reg)[0]}</b>
                                                </span>,
                                                text,
                                            ]
                                            : text
                                    )
                                : val;
                        },
                    },
                    {
                        title: '姓名',
                        dataIndex: 'realName',
                    },
                    {
                        title: '性别',
                        dataIndex: 'gender',
                        render: (val) => (!_.isEmpty(val) ? '' : val <= 0 ? '男' : '女'),
                    },
                    {
                        title: '积分',
                        dataIndex: 'points',
                        render: (val, row) => (row.isVolunteer ? val : '-'),
                    },
                    {
                        title: '等级',
                        dataIndex: 'vip',
                        render: (val, row) => (row.isVolunteer ? `V${val}` : '-'),
                    },

                    {
                        title: '所属',
                        dataIndex: 'org',
                        render: (val) => (!!val ? val.name : '-'),
                    },
                    {
                        title: '角色',
                        dataIndex: 'role.name',
                    },
                    {
                        title: '状态',
                        dataIndex: 'status',
                    },
                    {
                        title: '修改时间',
                        dataIndex: 'update_at',
                        sorter: true,
                        render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
                    },
                    {
                        title: '注册时间',
                        dataIndex: 'create_at',
                        sorter: true,
                        render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss'),
                    },
                    {
                        title: '操作',
                        dataIndex: 'id',
                        render: (val, row) => this.renderActions(row),
                    },
                ];

                fields = [
                    'id',
                    'avatarPath',
                    'nickname',
                    'org',
                    'points',
                    'vip',
                    'realName',
                    'gender',
                    'role.name',
                    'status',
                    'create_at',
                ];
                showQueryCondition = true;
                break;
        }

        this.props.dispatch({
            type: `${MODEL_NAME}/set`,
            payload: {
                columns,
                fields,
                showQueryCondition,
            },
        });
    };

    loadData = (payload) => {
        const { dispatch } = this.props;

        payload.roleToken = 'volunteer';

        dispatch({
            type: `${MODEL_NAME}/fetch`,
            payload,
        });
    };

    refresh = () => {
        const { data } = this.props;
        this.loadData({ page: data.page });
    };

    onTableChange = (pagination, filters, sorter, extra) => {
        let sort = null;
        let order = null;

        if (!_.isEmpty(sorter)) {
            sort = sorter.columnKey;
            order = sorter.order === 'ascend' ? 'ASC' : 'DESC';
        }

        this.loadData({ page: pagination.current, sort, order });
    };

    onFieldsChange = (fields) => {
        this.props.dispatch({
            type: `${MODEL_NAME}/set`,
            payload: {
                fields,
            },
        });
    };

    onSubmit = (e) => {
        e.preventDefault();

        this.props.form.validateFields((err, values) => {
            if (!!err) return false;

            if (!!values.create_at) {
                values.create_at = values.create_at
                    .map((item) => moment(item).format('YYYY-MM-DD HH:mm:ss'))
                    .join(',');
            }

            this.loadData({ page: 0, ...values });
        });
    };

    onReset = () => {
        this.props.form.resetFields();

        this.props.dispatch({
            type: `${MODEL_NAME}/set`,
            payload: {
                queryParams: {},
            },
        });
    };

    renderActions = (user) => {
        const { onSelect } = this.props;
        return (
            <Button type="primary" onClick={() => onSelect(user)}>
                选择
            </Button>
        );
    };

    render() {
        const {
            dispatch,
            data,
            organization,
            selectedRowKeys,
            columns,
            fields,
            showQueryCondition,
            loading,
            visible,
            onClose,
            width
        } = this.props;
        const { getFieldDecorator } = this.props.form;

        const tableColumns = columns.filter((item) => fields.includes(item.dataIndex));

        const list = data.list || [];

        const pagination = {
            defaultCurrent: 1,
            current: data.page,
            pageSize: data.pageSize,
            total: data.total,
            hideOnSinglePage: true,
            showTotal: (total) => `共${total}条记录 `,
        };

        const rowSelection = {
            selectedRowKeys,
            onChange: (selectedRowKeys, selectedRows) => {
                dispatch({
                    type: `${MODEL_NAME}/set`,
                    payload: {
                        selectedRowKeys,
                        selectedRows,
                    },
                });
            },
        };

        return <Drawer
            title="选择执行者"
            placement="right"
            closable={true}
            width={width || '80%'}
            onClose={onClose}
            visible={visible}
        >
            <Layout>
                <Content>
                    {showQueryCondition ? (
                        <Collapse defaultActiveKey={['1']}>
                            <Panel header="志愿者列表 | 查询条件" key="1">
                                <Form
                                    onSubmit={this.onSubmit}
                                    style={{
                                        padding: 5,
                                        marginBottom: 20,
                                    }}
                                >
                                    <Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="昵称">
                                        {getFieldDecorator('keyword')(<Input placeholder="请输入搜索关键词" />)}
                                    </Form.Item>

                                    <Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="注册时间">
                                        {getFieldDecorator('create_at')(
                                            <RangePicker showTime format="YYYY-MM-DD HH:mm:ss" />
                                        )}
                                    </Form.Item>

                                    <Form.Item labelCol={{ span: 4 }} wrapperCol={{ span: 14 }} label="组织架构">
                                        {getFieldDecorator('org')(
                                            <TreeSelect
                                                treeNodeFilterProp="title"
                                                showSearch
                                                treeDefaultExpandAll
                                                treeData={organization.data}
                                            />
                                        )}
                                    </Form.Item>
                                    <Row>
                                        <Col span={12} offset={3}>
                                            <Button type="primary" htmlType="submit">
                                                <Icon type="search" />
                                                搜索
                          </Button>
                                            <Button style={{ marginLeft: 8 }} onClick={this.onReset}>
                                                <Icon type="undo" />
                                                重置
                          </Button>
                                        </Col>
                                    </Row>
                                </Form>
                            </Panel>
                        </Collapse>
                    ) : (
                            ''
                        )}
                    <Row className="filter-row" gutter={6}>
                        <Col className="gutter-row" span={24}>
                            <Table
                                rowKey="id"
                                loading={loading}
                                columns={tableColumns}
                                onChange={this.onTableChange}
                                rowSelection={rowSelection}
                                pagination={pagination}
                                dataSource={list}
                            />
                        </Col>
                    </Row>
                </Content>
            </Layout>
        </Drawer>
    }
}