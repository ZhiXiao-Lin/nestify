export enum RowStatus {
    NORMAL,
    DELETED
}

export enum UploadActionType {
    IMPORT = 'IMPORT',
    UPLOAD = 'UPLOAD'
}

export enum StorageType {
    LOCAL = 'local',
    QINIU = 'qiniu'
}

export enum Gender {
    MALE,
    FEMALE
}

export enum VIP {
    V0,
    V1,
    V2,
    V3,
    V4,
    V5
}

export enum PointsActionType {
    ADD = 'add',
    SUB = 'sub'
}

export enum FlowTemplateEnum {
    WORK_OR = 'WORK_OR',
    APPLY_VR = 'APPLY_VR'
}

export enum FlowOperationsEnum {
    ALLOCATION = 'ALLOCATION',  // 分配用户或角色
    REMARKS = 'REMARKS'         // 备注信息
}

export enum NoticeType {
    NOTIFICATION = 'notification',
    MESSAGE = 'message',
    EVENT = 'event'
}
