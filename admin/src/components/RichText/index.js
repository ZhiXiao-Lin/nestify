import React, { Component, Fragment } from 'react';
import { Button } from 'antd';
import BraftEditor from 'braft-editor';
import 'braft-editor/dist/index.css';

export default class extends Component {
  state = {
    defaultProps: {},
  };

  componentDidMount() {
    this.init();
  }

  componentWillReceiveProps() {
    this.init();
  }

  init = () => {
    const { contentId, html, onSave, onMediaUpload } = this.props;

    const defaultProps = {
      placeholder: '请输入内容',
      contentFormat: 'html',
      value: BraftEditor.createEditorState(html),
      contentId,
      onSave,
      media: {
        uploadFn: onMediaUpload,
      },
    };

    this.setState((state) => ({
      ...state,
      defaultProps,
    }));
  };

  toSave = () => {
    this.props.onSave(this.editorRef.getValue().toHTML());
  };

  render() {
    const { html, contentId, onSave, onMediaUpload } = this.props;

    const editorProps = {
      placeholder: '请输入内容',
      contentFormat: 'html',
      value: BraftEditor.createEditorState(html),
      contentId,
      onSave,
      media: {
        uploadFn: onMediaUpload,
      },
    };

    return (
      <Fragment>
        <Button type="primary" style={{ marginBottom: 10 }} onClick={this.toSave}>
          保存
        </Button>
        <BraftEditor ref={(e) => (this.editorRef = e)} {...editorProps} />
      </Fragment>
    );
  }
}
