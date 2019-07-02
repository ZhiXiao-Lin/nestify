import React, { Component } from 'react';
import { Modal } from 'antd';

export default class Preview extends Component {

    render() {
        const { visible, onCancel, data, styleProps } = this.props;

        return <Modal visible={visible} footer={null} onCancel={onCancel}>
            <img style={{ width: '100%' }} src={data} {...styleProps} />
        </Modal>
    }
}