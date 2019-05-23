import React, { Component } from 'react';
import { withRouter } from 'next/router';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import Annoucement from './components/Annoucement';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';
import PaginationList from './components/Pagination';

import config from './_config';

import './styles/introduction.scss';

@withRouter
export default class extends Component {
    renderHandler = () => ({ siteInfo }) => {
        const { setting } = siteInfo;

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
                            <span>景区介绍</span>
                        </div>
                        <div className="main-content">

                            <div className="message-view">
                                <div className="send-message">
                                    <a href={config.URL['投诉建议']}>我要留言</a>
                                </div>
                                <div className="message-list">
                                    <div className="message-item-container">
                                        <div className="message-item">
                                            <p>萍乡市委副书记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效？</p>
                                            <p>本栏目受理个人和企业在对本局各部门办事过程中有关法规、政策、程序等问题的咨询。一般问题提问部门将在5个工作日给予答复，复杂些的适当延长。本栏目答复是一种指导性意见不具有法定效力。具体问题要通过法定途径门办事过程中有关法规、政策、程序等问题的咨询。</p>
                                        </div>
                                    </div>
                                    <div className="message-item-container">
                                        <div className="message-item">
                                            <p>萍乡市委副书记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效？</p>
                                            <p>本栏目受理个人和企业在对本局各部门办事过程中有关法规、政策、程序等问题的咨询。一般问题提问部门将在5个工作日给予答复，复杂些的适当延长。本栏目答复是一种指导性意见不具有法定效力。具体问题要通过法定途径门办事过程中有关法规、政策、程序等问题的咨询。</p>
                                        </div>
                                    </div>
                                    <div className="message-item-container">
                                        <div className="message-item">
                                            <p>萍乡市委副书记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效？</p>
                                            <p>本栏目受理个人和企业在对本局各部门办事过程中有关法规、政策、程序等问题的咨询。一般问题提问部门将在5个工作日给予答复，复杂些的适当延长。本栏目答复是一种指导性意见不具有法定效力。具体问题要通过法定途径门办事过程中有关法规、政策、程序等问题的咨询。</p>
                                        </div>
                                    </div>
                                    <div className="message-item-container">
                                        <div className="message-item">
                                            <p>萍乡市委副书记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效？</p>
                                            <p>本栏目受理个人和企业在对本局各部门办事过程中有关法规、政策、程序等问题的咨询。一般问题提问部门将在5个工作日给予答复，复杂些的适当延长。本栏目答复是一种指导性意见不具有法定效力。具体问题要通过法定途径门办事过程中有关法规、政策、程序等问题的咨询。</p>
                                        </div>
                                    </div>
                                    <div className="message-item-container">
                                        <div className="message-item">
                                            <p>萍乡市委副书记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效？</p>
                                            <p>本栏目受理个人和企业在对本局各部门办事过程中有关法规、政策、程序等问题的咨询。一般问题提问部门将在5个工作日给予答复，复杂些的适当延长。本栏目答复是一种指导性意见不具有法定效力。具体问题要通过法定途径门办事过程中有关法规、政策、程序等问题的咨询。</p>
                                        </div>
                                    </div>
                                    <div className="message-item-container">
                                        <div className="message-item">
                                            <p>萍乡市委副书记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效记、市长李江河莅临萍安钢铁调研充分肯定企业环境治理成效？</p>
                                            <p>本栏目受理个人和企业在对本局各部门办事过程中有关法规、政策、程序等问题的咨询。一般问题提问部门将在5个工作日给予答复，复杂些的适当延长。本栏目答复是一种指导性意见不具有法定效力。具体问题要通过法定途径门办事过程中有关法规、政策、程序等问题的咨询。</p>
                                        </div>
                                    </div>
                                </div>
                                <PaginationList
                                    total={255}
                                    pageSize={25}
                                    defaultCurrent={1}
                                    onChange={() => console.log('onChange')}
                                />
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
