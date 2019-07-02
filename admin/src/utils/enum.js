export const WFStatus = {
  RUNNING: 0, // 运行中
  OVER: 1, // 已完成
  CANCELED: 2, // 已取消
};

export const WFResult = {
  RUNNING: 0, // 进行中
  SUCCESS: 1, //成功
  FAILURE: 2, // 失败
};

export const FlowOperationsEnum = {
  ALLOCATION: 'ALLOCATION',  // 分配用户或角色
  REMARKS: 'REMARKS'         // 备注信息
}