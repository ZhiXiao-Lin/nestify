import React, { Fragment } from 'react';
import { RegisterNode } from 'gg-editor';
import { getRectPath } from '../../utils';

const ICON_SIZE = 16;
const ICON_SPAN = 5;

export default class extends React.Component {
  render() {
    const { userAuthoritys } = this.props;
    const config = {
      // 绘制标签
      // drawLabel(item) {},

      // 绘制图标
      // afterDraw(item) {},

      // 对齐标签
      // adjustLabelPosition(item, labelShape) {
      //   const size = this.getSize(item);
      //   const padding = this.getPadding();
      //   const width = size[0];
      //   const labelBox = labelShape.getBBox();

      //   labelShape.attr({
      //     x: -width / 2 + padding[3],
      //     y: -labelBox.height / 2,
      //   });
      // },

      // 内置边距
      // [上, 右, 下, 左]
      // getPadding() {
      //   return [4, 8, 4, 8];
      // },

      // 标签尺寸
      // [宽, 高]
      // getSize(item) {
      //   const group = item.getGraphicGroup();

      //   const label = group.findByClass('label')[0];
      //   const labelBox = label.getBBox();

      //   const padding = this.getPadding(item);

      //   return [
      //     labelBox.width + padding[1] + padding[3],
      //     labelBox.height + padding[0] + padding[2],
      //   ];
      // },

      // 节点路径
      // x, y, w, h, r
      // getPath(item) {
      //   const size = this.getSize(item);
      //   const style = this.getStyle(item);

      //   return getRectPath(
      //     -size[0] / 2,
      //     -size[1] / 2,
      //     size[0] + ICON_SIZE + ICON_SPAN,
      //     size[1],
      //     style.radius
      //   );
      // },

      // 节点样式
      getStyle(item) {
        return {
          fill: '#cccccc',
          fillOpacity: 0,
          radius: 4,
          lineWidth: 2,
        };
      },

      // 标签样式
      getLabelStyle(item) {
        const { model } = item;
        const isEnable = userAuthoritys.includes(model.id);

        return {
          fill: isEnable ? '#333333' : '#b0b0b0',
          lineHeight: 16,
          fontSize: 14,
        };
      },

      // 激活样式
      // getActivedStyle(item) {
      //   return {
      //     stroke: '#44C0FF',
      //     lineWidth: 2,
      //   };
      // },

      // 选中样式
      // getSelectedStyle(item) {
      //   return {
      //     stroke: '#1AA7EE',
      //     lineWidth: 2,
      //   };
      // },
    };

    return (
      <Fragment>
        <RegisterNode name="mind-base" config={config} extend={'mind-base'} />
        <RegisterNode name="custom-node" config={config} extend={'mind-base'} />
      </Fragment>
    );
  }
}
