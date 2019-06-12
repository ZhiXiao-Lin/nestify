# Nestify

[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php) [![Gitter](https://badges.gitter.im/nestify-stack/community.svg)](https://gitter.im/nestify-stack/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) [![star this repo](http://githubbadges.com/star.svg?user=ZhiXiao-Lin&repo=nestify&style=default)](https://github.com/ZhiXiao-Lin/nestify) [![fork this repo](http://githubbadges.com/fork.svg?user=ZhiXiao-Lin&repo=nestify&style=default)](https://github.com/ZhiXiao-Lin/nestify/fork)

-   开箱即用的内容管理框架

![搜索](/server/static/images/搜索.gif)
![导入](/server/static/images/导入.gif)
![新增用户](/server/static/images/新增用户.gif)

## 技术选型

-   Nestjs、Nextjs、Fastify、TypeORM、ElasticSearch、Ant Design...

## 使用方法

1. git clone 项目到本地
2. 执行 yarn && yarn:ic
3. 安装 ElasticSearch、InfluxDB、PostgreSQL、Redis
4. 修改 server/package.json 以及 server/database/ 中 sql 文件的账户信息
5. 回到根目录执行 yarn db:create 和 yarn db:init
6. 开发模式启动前后台执行 yarn dev
7. 默认账号：SysAdmin 密码：12345678

## 文档

-   [在线文档](http://docs.nestify.cn/)
-   启动项目后访问 http://127.0.0.0:3000/docs/ 查看接口文档
-   执行 yarn doc 然后访问 http://127.0.0.0:8080/ 查看项目文档

## 功能概览

-   Fastify 的超强性能
-   React 服务端渲染
-   React SPA 后台管理系统
-   ElasticSearch 全文检索
-   RBAC 权限管理
-   日志模块
-   配置文件
-   安全保护
-   访问频率
-   堆栈跟踪
-   定时任务
-   文件上传、监控、搜索、管理
-   脚本创建、初始化、迁移、回滚数据库
-   Excel 导入、导出
-   Swagger API 文档
-   InfluxDB 时序数据库
-   WebSocket
-   系统监控
-   缓存模块
-   短信模块

## 正在开发的功能

-   容器部署
-   K8S
-   邮件模块
-   消息队列
-   单元测试
-   持续集成
-   工作流引擎
-   云存储接入
-   即时通讯接入
-   ...

## 其他

-   本项目由开源组织 [NestifyStack](https://github.com/nestify-stack) 强力驱动

## 协议

Nestify is [MIT licensed](LICENSE).
