import React, { Fragment } from 'react';
import { Button, Upload, Icon } from 'antd';
import { Player } from 'video-react';

import 'video-react/dist/video-react.css';

export default class extends React.Component {
    state = {
        width: 600
    };

    componentDidMount() {
        const { width } = this.props;

        this.setState((state) => ({
            ...state,
            width: width || 600
        }));

    }

    componentWillReceiveProps(nextProps) {
        const { width } = this.props;

        this.setState((state) => ({
            ...state,
            width: width || 600
        }));
    }

    render() {
        const { width } = this.state;
        const { url, onUpload } = this.props;

        return (
            <Fragment>
                {!url ? (
                    <Upload action={null} accept="video/*" showUploadList={false} beforeUpload={onUpload}>
                        <div
                            style={{
                                textAlign: 'center',
                                width,
                                border: '1px #ccc dashed',
                                position: 'relative',
                                cursor: 'pointer'
                            }}
                        >
                            <p className="ant-upload-drag-icon" style={{ paddingTop: width * 0.1 }}>
                                <Icon type="upload" />
                            </p>
                            <p className="ant-upload-text" style={{ paddingBottom: width * 0.1 }}>点击上传视频</p>
                        </div>
                    </Upload>
                ) : (<Fragment>
                    <Upload action={null} accept="video/*" showUploadList={false} beforeUpload={onUpload}>
                        <Button type="primary" icon="upload" style={{ margin: 10 }}>重新上传</Button>
                    </Upload>
                    <div
                        style={{
                            textAlign: 'center',
                            width,
                            border: '1px #ccc dashed',
                            position: 'relative',
                            cursor: 'pointer'
                        }}
                    >

                        <Player width={width}>
                            <source src={url} />
                        </Player>
                    </div>
                </Fragment>
                    )}
            </Fragment>
        );
    }
}
