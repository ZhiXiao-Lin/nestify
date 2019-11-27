import React, { Component } from 'react';
import OSS from 'ali-oss';
import shortid from 'shortid';
import cssModules from 'react-css-modules';
import { Upload, Icon, Modal } from 'antd';
import { getSTS } from 'util/api';
import styles from './style.less';

function getFileExt(filename) {
  let ext = '';
  const pos = filename.lastIndexOf('.');
  if (pos > 0) {
    ext = filename.substring(pos, filename.length);
  }

  return ext;
}

@cssModules(styles)
class OSSUpload extends Component {
  state = {
    imageDataUrl: '',
    loading: false

  }

  beforeUpload = (file) => {
    const image = file.type.indexOf('image') > -1;
    if (!image) {
      Modal.error({
        content: '只能上传图片文件'
      });
      return false;
    }

    const empty = file.size <= 0;
    if (empty) {
      Modal.error({
        content: '不能上传空文件'
      });
      return false;
    }

    const limit = file.size / 1024 / 1024 < 10;
    if (!limit) {
      Modal.error({
        content: '文件大小不能超过10M'
      });
      return false;
    }

    return true;
  }

  getBase64 = img => (
    new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(img);
      } catch (error) {
        resolve(null);
      }
    })
  )

  handleChange = async (info) => {
    const { onChange } = this.props;
    let { file } = info;

    if (file.status === 'done') {
      if (file.response && file.response.url) {
        file.ossName = file.response.name;
        file.url = file.response.url;

        const imageDataUrl = await this.getBase64(info.file.originFileObj);

        this.setState({
          imageDataUrl
        });
      } else {
        file = null;
      }
    }

    typeof onChange === 'function' && onChange(file);
  }

  customRequest = async (option) => {
    this.setState({
      loading: true
    });

    const res = await getSTS();

    if (res && res.code === 0 && res.data) {
      const client = new OSS({
        ...res.data,
        expire: ''
      });

      // const fileName = `upload/${shortid.generate()}${getFileExt(option.file.name)}`;
      const fileName = `${shortid.generate()}${getFileExt(option.file.name)}`;
      const result = await client.put(fileName, option.file);

      if (result.res && result.res.status === 200) {
        option.onSuccess(result);
      } else {
        option.onError(result);
      }
    } else {
      console.error('请实现自己的STS接口，详情可参考 https://help.aliyun.com/document_detail/32077.html?spm=a2c4g.11186623.6.788.qrBaau');
    }

    this.setState({
      loading: false
    });
  }

  render() {
    const { disabled, listType, beforeUpload, value, desc } = this.props;
    const { loading, imageDataUrl } = this.state;

    const loadingNode = (
      <div>
        <Icon type="loading" />
        <div className="ant-upload-text">上传中</div>
      </div>
    );

    return (
      <div styleName="upload">
        <Upload
          disabled={loading || disabled}
          showUploadList={false}
          listType={listType}
          fileList={value ? [value] : []}
          onChange={this.handleChange}
          customRequest={this.customRequest}
          beforeUpload={beforeUpload}
        >
          { loading ? loadingNode : this.props.children }
        </Upload>
        { desc && <div styleName="desc">{desc}</div> }
        { (imageDataUrl || (value && value.thumbnailUrl)) && <div styleName="preview"><img src={imageDataUrl || value.thumbnailUrl} alt="preview" /></div> }
      </div>
    );
  }
}

export default OSSUpload;
