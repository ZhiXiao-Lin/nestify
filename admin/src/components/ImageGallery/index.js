import React, { Fragment } from 'react';
import _ from 'lodash';
import { Icon, Button, Upload } from 'antd';

const UploadButton = ({ mode, limit, length }) => {
    // console.log({ mode, limit, length });
    if (mode !== 'edit') return null;
    else if ( (!!limit) && (length >= limit) ) return null;
    else return (
        <div>
            <Icon type="plus" />
            <div className="ant-upload-text">Upload</div>
        </div>
    );
}

export function transformFileObj(f) {
    return {
        uid         : f.uid || null,
        name        : f.name || null,
        preUrl      : f.preUrl || null,
        key         : f.key || null,
        type        : f.type || null,
        url         : f.url || null,
    };
}

export default class ImageGallery extends React.PureComponent {

    constructor(props) {
        super(props);
        this.state = {
            imageFiles: [],
        }
    }
    initialState = (props)=>{ this.setState({ imageFiles: props.initialValue || [] }) }
    componentWillReceiveProps(nextProps) { 
        this.initialState(nextProps); 
    }
    componentDidMount() {
        const { ref } = this.props;
        if (!!ref) ref(this);
        this.initialState(this.props);
    }

    // upload step 1:
    beforeUpload = (file) => { 
        // console.log('beforupload');
        return true; 
    }
    // upload step 2:
    customUpload = async (context) => {
        // console.log('###### customUpload: ', !!context && !!context.file && context.file.name);
        const { file, onSuccess, onError, /*onProgress*/ } = context;

        const { onUpload } = this.props;
        if (!onUpload) {
            onError(new Error('No upload handler found!'), file);
            return;
        }

        try {
            // onProgress({percent: 36}, file);
            const response = await onUpload(file);
            // console.log({'customUpload response': response});
            if (response instanceof Error) throw response;

            onSuccess( response, file );

        } catch (err) {
            onError( { error: err }, file );
        }
    }
    // upload step 3:
    toHandleChange = ({ file, fileList, event }) => {
        // console.log('toHandleChange', file, fileList);
        // console.log(`###### toHandleChange: ${file.name} (${file.status}) @ ${file.percent}%`, file, fileList, event);
        // fileList.forEach((f, i) => {
        //     console.log(`[${i}] ${f.name} (${f.status}) @ ${f.percent}%`);
        // })
        const f = _.find(fileList, {uid: file.uid});
        if (!f) {
            console.log('###### file no found (removed) ');
        }
        else if (!!f.response && !!f.response.result && !!f.response.preUrl) { 
            f.url       = f.response.preUrl + f.response.result.slice(1); 
            f.preUrl    = f.response.preUrl; 
            f.key       = f.response.result; 
        }
        this.setState( { imageFiles: [...fileList] } );
    }
    beforeRemove = async (file) => {
        // console.log({'beforeRemove': file});

        if (!file || !file.key) return true;

        const { onDelete } = this.props;

        const result  = await onDelete(file);
        // console.log({'result': result});
        if (result instanceof Error) {
            return false;
        } else return true;
    }

    toShowPreview = (file) => {
        if (!file || !file.url) return;
        window.open(file.url, "_blank");
    }
    render() {
        const { onSave, mode, limit } = this.props;
        const { imageFiles } = this.state;
        const length = imageFiles.length;
        return (
            <Fragment>
                <div>
                {   !onSave ? null : 
                    <Button type='primary' onClick={onSave} >保存</Button> 
                }
                </div>
                <div>
                    <Upload action={null} accept="image/*" listType="picture-card"
                        fileList={imageFiles}
                        beforeUpload={this.beforeUpload}
                        customRequest={this.customUpload}
                        onRemove={this.beforeRemove}
                        onChange={this.toHandleChange}
                        onPreview={this.toShowPreview}
                    >
                        { UploadButton({mode, limit, length}) /** DON'T USE <UploadButton {...{mode, limit, length}} /> !!! */ }
                    </Upload>
                </div>
            </Fragment>
        );
    }
}
