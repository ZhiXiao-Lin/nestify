# Nestify

[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php) [![Gitter](https://badges.gitter.im/nestify-stack/community.svg)](https://gitter.im/nestify-stack/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) [![star this repo](http://githubbadges.com/star.svg?user=ZhiXiao-Lin&repo=nestify&style=default)](https://github.com/ZhiXiao-Lin/nestify) [![fork this repo](http://githubbadges.com/fork.svg?user=ZhiXiao-Lin&repo=nestify&style=default)](https://github.com/ZhiXiao-Lin/nestify/fork)

-   开箱即用的中后台全栈解决方案

## 技术选型

-   Nestjs、Nextjs、Fastify、TypeORM、ElasticSearch、Ant Design...

## 开发环境

-   macOS Mojave 10.14.5
-   Node.js 11.10.0
-   Redis 5.0.3
-   PostgreSQL 9.6
-   InfluxDB 1.7.6
-   ElasticSearch 5.6 以及中文分词插件 IK 5.6 (关于 ES 对机器配置要求高的问题，正在寻找轻量级替代方案)

## 使用方法

1. git clone 项目到本地
2. 执行 yarn && yarn:ic
3. 安装 Node.js、Redis、PostgreSQL、InfluxDB、ElasticSearch
4. 修改 server/package.json 以及 server/database/ 中 sql 文件的账户信息
5. 根目录执行 yarn db:create 用于创建数据库和数据库用户
6. 执行 yarn db:init 用于创建数据表和导入种子数据
7. 开发模式启动前后台执行 yarn dev
8. 默认账号：SysAdmin 密码：12345678
9. 在开发模式下修改了实体需要执行 yarn db:init，用于重新构建数据表和导入种子数据
10. yarn orm 是 TypeORM CLI 的封装, 例如：执行 yarn orm schema:sync 等同于执行 typeorm schema:sync
11. 所有被导入种子数据的 excel 文件都存放在 src/seeds 中，可以根据需要进行调整

-   注：永远不要在生产环境下使用 yarn db:init

## 文档

-   [在线文档](http://docs.nestify.cn/)
-   启动项目后访问 http://127.0.0.0:3000/docs/ 查看接口文档
-   执行 yarn doc 然后访问 http://127.0.0.0:8080/ 查看项目文档

## 功能概览

-   Fastify 的超强性能
-   React 服务端渲染
-   React SPA 后台管理系统
-   InfluxDB 时序数据库
-   Socket.IO 双向通讯
-   ElasticSearch 全文检索
-   RBAC 权限管理
-   日志模块
-   配置文件
-   安全保护
-   访问频率限制
-   堆栈跟踪，全局异常捕获
-   定时任务、延时任务、间隔任务
-   文件上传、监控、搜索、管理
-   脚本创建、初始化、迁移、回滚数据库
-   Excel 导入、导出
-   Swagger API 文档
-   系统监控
-   缓存模块
-   短信模块
-   单元测试
-   持续集成
-   持续部署

## 其他

-   本项目由开源组织 [NestifyStack](https://github.com/nestify-stack) 强力驱动

## 协议

Nestify is [MIT licensed](LICENSE).
