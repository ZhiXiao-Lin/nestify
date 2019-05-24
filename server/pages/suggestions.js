import React, { Component } from 'react';
import { Form, Input, Button, Row, Col } from 'antd';
import { withRouter } from 'next/router';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import Annoucement from './components/Annoucement';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';

import config from './_config';

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
    renderHandler = () => ({ siteInfo }) => {
        const { setting } = siteInfo;
        const { getFieldDecorator, validateFields } = this.props.form;
        const handleSubmit = (e) => {
            e.preventDefault();
            validateFields((err, values) => {
                if (!err) {
                    console.log('Received values of form: ', values);
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
                            <span>留言咨询</span>
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
                                                type="password"
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
                                            <Input
                                                prefix={<i style={{ color: "red" }}>*</i>}
                                                placeholder="咨询内容"
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
                                                    />
                                                )}
                                            </Col>
                                            <Col span={12}>
                                                <a href="javascript:;" className="code"><img src='http://dummyimage.com/200x40/4d494d/686a82.gif&text=8fclp' alt='8fclp' /></a>
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
