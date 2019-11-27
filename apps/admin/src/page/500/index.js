import React, { Component } from 'react';
import { Exception } from 'ant-design-pro';

export default class E500 extends Component {
  render() {
    return (
      <Exception type="500" />
    );
  }
}
