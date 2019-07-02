import { Button, Modal, Upload, Icon } from 'antd';
import UUID from 'uuid';
import AvatarEditor from 'react-avatar-editor';
import Preview from '@/components/Preview';
import { apiUploadOne } from '@/utils';
import config from '@/config';
import { Fragment } from 'react';


const gEditorStyle = { display: 'block', margin: '10px auto' };

export function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {
        type: mime
    });
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

export default class extends React.Component {
    state = {
        imageFile: null,
        scale: 1,
        width: 400,
        height: 400,
        borderRadius: 0,

        previewVisible: false,
        previewImage: '',
        fileList: [

        ],
    };

    componentDidMount() {
        const { scale, width, height, borderRadius, initialValue } = this.props;

        this.setState((state) => ({
            ...state,
            scale: scale || 1,
            width: width || 400,
            height: height || 400,
            borderRadius: borderRadius || 0,
            fileList: initialValue || []
        }));

        const self = this;
        const scrollFunc = function (e) {
            // var direct = 0;
            e = e || window.event;
            if (e.wheelDelta) {
                //判断浏览器IE，谷歌滑轮事件
                if (e.wheelDelta > 0) {
                    //当滑轮向上滚动时
                    self.setState({ scale: self.state.scale + 0.1 });
                }
                if (e.wheelDelta < 0) {
                    //当滑轮向下滚动时
                    self.setState({ scale: self.state.scale - 0.1 });
                }
            } else if (e.detail) {
                //Firefox滑轮事件
                if (e.detail > 0) {
                    //当滑轮向上滚动时
                    self.setState({ scale: self.state.scale + 0.1 });
                }
                if (e.detail < 0) {
                    //当滑轮向下滚动时
                    self.setState({ scale: self.state.scale - 0.1 });
                }
            }
        };
        if (document.addEventListener) {
            document.addEventListener('DOMMouseScroll', scrollFunc, false);
        } // W3C
        window.onmousewheel = document.onmousewheel = scrollFunc; // IE/Opera/Chrome
    }

    componentWillReceiveProps(nextProps) {
        const { scale, width, height, borderRadius, initialValue } = this.props;

        this.setState((state) => ({
            ...state,
            scale: scale || 1,
            width: width || 400,
            height: height || 400,
            borderRadius: borderRadius || 0,
            fileList: initialValue || []
        }));
    }

    beforeUpload = (imageFile) => {
        this.setState({ imageFile });
        return false;
    };

    toUpload = async () => {
        const { imageFile, fileList } = this.state;
        if (!!imageFile && !!this.editor) {
            const fakefile = dataURLtoBlob(this.editor.getImageScaledToCanvas().toDataURL('image/png'));

            fakefile.name = imageFile.name;

            const res = await apiUploadOne(fakefile);
            res.uid = UUID.v4();
            res.url = config.staticRoot + res.path;

            fileList.push(res);
        }
        this.setState({ imageFile: null, fileList });
    };

    toCloseModal = () => {
        const { onCancel } = this.props;
        if (!!onCancel) onCancel();
        this.setState({ imageFile: null });
    };

    onScaleChange = (value) => {
        this.setState((state) => ({
            ...state,
            scale: value
        }));
    };

    onWidthChange = (value) => {
        this.setState((state) => ({
            ...state,
            width: value
        }));
    };

    onHeightChange = (value) => {
        this.setState((state) => ({
            ...state,
            height: value
        }));
    };

    onRadiusChange = (value) => {
        this.setState((state) => ({
            ...state,
            borderRadius: value
        }));
    };

    handleCancel = () => this.setState({ previewVisible: false });

    handlePreview = async file => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }

        this.setState({
            previewImage: file.url || file.preview,
            previewVisible: true,
        });
    };

    handleRemove = async file => {
        this.setState(state => ({
            ...state,
            fileList: this.state.fileList.filter(item => item.uid !== file.uid)
        }))
    };

    toSave = () => {
        this.props.onSave(this.state.fileList);
    }

    render() {
        const { previewVisible, previewImage, fileList, imageFile, scale, width, height, borderRadius } = this.state;
        const { fileLimit } = this.props;

        const uploadButton = (
            <div>
                <Icon type="plus" />
                <div className="ant-upload-text">Upload</div>
            </div>
        );

        return (
            <Fragment>
                <Button type="primary" style={{ marginBottom: 10 }} onClick={this.toSave}>
                    保存
                </Button>
                <div className="clearfix">


                    <Upload
                        listType="picture-card"
                        fileList={fileList}
                        onPreview={this.handlePreview}
                        onRemove={this.handleRemove}
                        beforeUpload={this.beforeUpload}
                    >
                        {fileList.length >= (fileLimit || 6) ? null : uploadButton}
                    </Upload>

                    <Preview visible={previewVisible} onCancel={this.handleCancel} data={previewImage} />

                    <Modal
                        visible={!!imageFile}
                        title="图片裁剪"
                        okText="确认"
                        cancelText="取消"
                        width={width + 100}
                        height={height}
                        onOk={this.toUpload}
                        onCancel={this.toCloseModal}
                    >
                        <AvatarEditor
                            border={2}
                            color={[72, 118, 255, 1]}
                            style={gEditorStyle}
                            ref={(e) => this.editor = e}
                            image={imageFile}
                            scale={scale}
                            width={width}
                            height={height}
                            borderRadius={borderRadius}
                        />
                        <br />
                        <h3>{`请上传 ${width}px（宽） * ${height}px（高） 大小的图片`}</h3>
                    </Modal>
                </div>
            </Fragment>);
    }
}