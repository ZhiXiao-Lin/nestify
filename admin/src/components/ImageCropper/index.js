import React, { Fragment } from 'react';
import { Modal, Upload, Button } from 'antd';
import AvatarEditor from 'react-avatar-editor';

import { dataURLtoBlob } from '../../utils/utils';

const gEditorStyle = { display: 'block', margin: '10px auto' };

export default class ImageCropper extends React.Component {
  state = {
    imageFile: null,
    scale: 1
  }
  componentDidMount() {
    const self = this;
    const scrollFunc = function(e) {
      // var direct = 0;
      e = e || window.event;
      if (e.wheelDelta) { //判断浏览器IE，谷歌滑轮事件             
        if (e.wheelDelta > 0) { //当滑轮向上滚动时
          self.setState({ scale: self.state.scale + 0.1 })
        }
        if (e.wheelDelta < 0) { //当滑轮向下滚动时
          self.setState({ scale: self.state.scale - 0.1 })
        }
      } else if (e.detail) { //Firefox滑轮事件
        if (e.detail > 0) { //当滑轮向上滚动时
          self.setState({ scale: self.state.scale + 0.1 })
        }
        if (e.detail < 0) { //当滑轮向下滚动时
          self.setState({ scale: self.state.scale - 0.1 })
        }
      }
    }
    if (document.addEventListener) {
        document.addEventListener('DOMMouseScroll', scrollFunc, false);
    } // W3C
    window.onmousewheel = document.onmousewheel = scrollFunc; // IE/Opera/Chrome
  }
  componentWillReceiveProps(nextProps) {
  }

  setEditorRef = (editor) => { if (editor) this.editor = editor; }
  beforeUpload = (imageFile) => { 
    // console.log(imageFile); 
    this.setState({ imageFile }); 
    return false; 
  }
  toUpload = () => {
    const { onUpload } = this.props;
    const { imageFile } = this.state;
    if (!!onUpload && !!imageFile && !!this.editor) {
      const fakefile = dataURLtoBlob(this.editor.getImageScaledToCanvas().toDataURL("image/jpeg"));
      // console.log(fakefile);
      fakefile.name = imageFile.name;
      onUpload(fakefile);
    }
    this.setState({ imageFile: null});
  }
  toCloseModal = () => {
    const { onCancel } = this.props;
    if (!!onCancel) onCancel();
    this.setState({imageFile: null});
  }
  render() {
    const { imageFile, scale } = this.state;
    const { imageUrl } = this.props;

    return (
      <Fragment>

        <Upload action={null} showUploadList={false} beforeUpload={this.beforeUpload} >
          { !imageUrl ? 
            <Button small="small" icon="upload" >选择图片</Button>
            :
            <img src={imageUrl} alt="image" type="upload" />  
          }
        </Upload>

        <Modal visible={!!imageFile} title="图片裁剪"
          okText='确认'  cancelText='取消'
          onOk={this.toUpload}
          onCancel={this.toCloseModal}
        >
          <AvatarEditor border={50} color={[255, 255, 255, 0.6]} style={gEditorStyle}
            ref={this.setEditorRef} image={imageFile} scale={scale}
          />
        </Modal>

        {/* <br/>
        <Button style={{ marginTop: '10px'}} onClick={this.getDownloadUrl}>
          获取私有下载链接(测试)
        </Button> */}
      </Fragment>
    )
  }
}
