import React from 'react';
import moment from 'moment';
import { Form, Input, Button, Divider, message } from 'antd';

const formItemLayout = {
    labelCol    : { xs: { span: 24 }, sm: { span: 8 },  },
    wrapperCol  : { xs: { span: 24 }, sm: { span: 16 }, },
};

const gFieldsDetails = {
    'id'                : { render: (v) => (v) ,                                                        label: '编号'      },
    
    'cost'              : { render: (v) => (`￥${v/100}`) ,                                             label: '成本'      },
    'profit'            : { render: (v) => (`￥${v/100}`) ,                                             label: '利润'      },
    'revenue'           : { render: (v) => (`￥${v/100}`) ,                                             label: '财务营收'      },
    'receipt'           : { render: (v) => (`￥${v/100}`) ,                                             label: '实际收入'      },
    
    'status'           : { render: (v) => (v) ,                                                         label: '状态'      },

    'name'              : { render: (v) => (v) ,                                                        label: '名称'      },
    'price'             : { render: (v) => (`￥${v/100}`) ,                                             label: '价格'      },
    'spu_name'          : { render: (v) => (v) ,                                                        label: '产品名称'  },
    'brand'             : { render: (v) => (v) ,                                                        label: '品牌'      },
    'model'             : { render: (v) => (v) ,                                                        label: '型号'      },
    'factory'           : { render: (v) => (v) ,                                                        label: '制造商'    },
    'vendor'            : { render: (v) => (v) ,                                                        label: '供应商'    },
    'comm_ratio'        : { render: (v) => (v > 1 ? (`￥${v/100}`) : (`${v*100}%`)) ,                   label: '佣金/比例' },
    'catalog'           : { render: (v) => (v) ,                                                        label: '类目'      },
    'stock_id'          : { render: (v) => (v) ,                                                        label: '库存编号'  },
    'schedule_count'    : { render: (v) => (v) ,                                                        label: '班期数量'  },
    'vendor_name'       : { render: (v) => (v) ,                                                        label: '供应商'    },

    'platform_confirm_by' : { render: (v) => (v),                                                       label: '平台确认人员'},
    'platform_confirm_at' : { render: (v) => !v ? null : (moment(v).format('YYYY-MM-DD HH:mm:ss')),     label: '平台确认时间'},
    'vendor_confirm_by'   : { render: (v) => (v),                                                       label: '供应商确认人员'},
    'vendor_confirm_at'   : { render: (v) => !v ? null : (moment(v).format('YYYY-MM-DD HH:mm:ss')),     label: '供应商确认时间'},

    'expired_when'      : { render: (v) => !v ? null : (moment(v).format('YYYY-MM-DD HH:mm:ss')) ,      label: '过期时间'  },
    'created_when'      : { render: (v) => !v ? null : (moment(v).format('YYYY-MM-DD HH:mm:ss')) ,      label: '创建时间'  },
    'updated_when'      : { render: (v) => !v ? null : (moment(v).format('YYYY-MM-DD HH:mm:ss')) ,      label: '更新时间'  },
}

@Form.create()
export default class FormPlus extends React.Component {

    onReset = () => { this.props.form.resetFields();  }
    onSubmit = (e) => {
        e.preventDefault();

        const { onSave, editFields, form: { validateFields, getFieldsValue } } = this.props;
        if (!editFields) return;

        validateFields(
            Object.keys(editFields).filter((key) => (editFields[key] === true)), 
            (err, values) => {
                if (err) return;
                const fieldsvalue = getFieldsValue();
                if (Object.keys(fieldsvalue).length === 0) {
                    message.error('没有数据需要更新！');
                    return;
                }
                if (!!onSave) onSave(fieldsvalue);
            }
        );
    }

    toRenderViewItems = (target, field) => {
        return (
            Object.keys(field).map((key) => (
                (target[key] === undefined) ? null :
                <Form.Item {...formItemLayout} label={field[key].label} key={key}>
                    {field[key].render(target[key], target)}
                </Form.Item>
            ))
        )
    }
    toRenderEditItems = (target, field, keyLable) => {
        return (
            Object.keys(field).map((key) => (
                <Form.Item {...formItemLayout} label={keyLable[key].label} key={key}>
                    {
                    getFieldDecorator(key, {
                        initialValue: (!target[key] || !keyLable[key]) ? null : keyLable[key].render(target[key], target),
                        rules: [{ required: field[key], message: `${keyLable[key].label}不能为空`}],
                    })( <Input type="text" placeholder={'请输入' + keyLable[key].label} /> )
                    }
                </Form.Item>
            ))
        )
    }

    render() {
        const { onSave, fieldsDetails, editFields, target, form: { getFieldDecorator } } = this.props;

        const keylable = Object.assign({}, fieldsDetails, gFieldsDetails, fieldsDetails);

        return( 
            <Form onSubmit={this.onSubmit}>
            { !this.props.onSave ? this.toRenderViewItems(target, keylable) : this.toRenderEditItems(target, keylable, editFields) }
            { !this.props.onSave ? null : 
                <Form.Item {...formItemLayout}>
                    <Button onClick={this.onReset}>重置</Button>
                    <Button type="primary" htmlType="submit">保存</Button>
                </Form.Item>
            }
            </Form>
        )
    }
}
