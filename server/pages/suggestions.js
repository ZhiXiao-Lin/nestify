import React, { Component } from 'react';
import { Form, Input, Button, Row, Col, message } from 'antd';
import { withRouter } from 'next/router';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import Annoucement from './components/Annoucement';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';

import config from './_config';
import Fetch from './_fetch';

import './styles/introduction.scss';

const formItemLayout = {
    labelCol: {
        xs: { span: 24 },
        sm: { span: 8 },
    },
    wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 },
    },
};

@withRouter
class Suggestion extends Component {
    state = {
        flag: false,
        svg_code: '',
        svg_hash: ''
    }
    componentDidMount() {
        this.toGetCode()
    }
    toGetCode = async () => {
        const res = await Fetch('GET', '/getSVGCode');
        this.setState({ ...res });
    }
    toCheckCode = async (e) => {
        const { form: { setFields } } = this.props;
        const { svg_hash } = this.state;
        const { value } = e.target;
        const res = await Fetch('POST', '/checkSVGCode', {
            svg_hash,
            svg_text: e.target.value
        });
        setFields({
            code: {
                value,
                errors: res.result ? null : [{
                    "message": "验证码输入错误！",
                }]
            }
        })
        this.setState({ flag: res.result })
    }
    renderHandler = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        const { getFieldDecorator, validateFields } = this.props.form;
        const { flag, svg_code } = this.state;
        const handleSubmit = (e) => {
            e.preventDefault();
            validateFields(async (err, values) => {
                if (!err && flag) {
                    message.info('正在提交中，请稍候！', 0);
                    const res = await Fetch('POST', '/saveSuggesstion', values)
                    message.destroy()
                    if (res.result) {
                        message.success('提交成功！请您耐心等待管理员的回复！', 5);
                    } else {
                        message.error('很抱歉，提交失败！', 5);
                    }
                } else if(!flag) {
                    message.error('验证码验证失败！');
                }
            });
        }
        return (
            <div className="hdz-home-body">
                <Menu />
                <BreadCrumbs />
                <div className="introduction-content">
                    <div className="guide-navi">
                        <NaviPanel />
                        <TourGuide.Contact setting={setting} />
                    </div>
                    <div className="intro-main">
                        <div className="main-title">
                            <span>投诉建议</span>
                        </div>
                        <div className="main-content">

                            <div className="suggestion-view">
                                {<Form onSubmit={handleSubmit} className="login-form" {...formItemLayout}>
                                    <Form.Item>
                                        {getFieldDecorator('username', {
                                            rules: [{ required: true, message: '请输入昵称' }],
                                        })(
                                            <Input
                                                prefix={<i style={{ color: "red" }}>*</i>}
                                                type="text"
                                                placeholder="昵称"
                                            />
                                        )}
                                    </Form.Item>
                                    <Form.Item>
                                        {getFieldDecorator('title', {
                                            rules: [{ required: true, message: '请输入标题' }],
                                        })(
                                            <Input
                                                prefix={<i style={{ color: "red" }}>*</i>}
                                                type="text"
                                                placeholder="标题"
                                            />
                                        )}
                                    </Form.Item>
                                    <Form.Item>
                                        {getFieldDecorator('phone', {
                                            rules: [{ required: true, message: '请输入电话' }],
                                        })(
                                            <Input
                                                prefix={<i style={{ color: "red" }}>*</i>}
                                                type="number"
                                                placeholder="电话"
                                            />
                                        )}
                                    </Form.Item>
                                    <Form.Item>
                                        {getFieldDecorator('content', {
                                            rules: [{ required: true, message: '请输入咨询内容' }],
                                        })(
                                            <Input.TextArea
                                                prefix={<i style={{ color: "red" }}>*</i>}
                                                placeholder="咨询内容"
                                                autosize={{ minRows: 4, maxRows: 6 }}
                                            />
                                        )}
                                    </Form.Item>
                                    <Form.Item>
                                        <Row gutter={8} type="flex" align="middle">
                                            <Col span={12}>
                                                {getFieldDecorator('code', {
                                                    rules: [{ required: true, message: '请输入验证码' }],
                                                })(
                                                    <Input
                                                        prefix={<i style={{ color: "red" }}>*</i>}
                                                        placeholder="验证码"
                                                        onChange={this.toCheckCode}
                                                    />
                                                )}
                                            </Col>
                                            <Col span={12}>
                                                <a href="javascript:;" className="code" onClick={this.toGetCode} dangerouslySetInnerHTML={{ __html: svg_code }}></a>
                                            </Col>
                                        </Row>
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" htmlType="submit" className="login-form-button"> 提交 </Button>
                                    </Form.Item>
                                </Form>}
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        );
    }
    render() {
        return (
            <CommonLayout>
                <GlobalContext.Consumer>
                    {this.renderHandler()}
                </GlobalContext.Consumer>
            </CommonLayout>
        );
    }
}


export default Form.create()(Suggestion);
