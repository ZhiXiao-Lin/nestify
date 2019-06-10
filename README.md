# Nestify

-   开箱即用的内容管理框架

![搜索](/server/static/images/搜索.gif)
![导入](/server/static/images/导入.gif)
![新增用户](/server/static/images/新增用户.gif)

## 技术选型

-   Nestjs、Nextjs、Fastify、TypeORM、ElasticSearch、Ant Design...

## 使用方法

1. git clone 项目到本地
2. 分别在 根、server、admin 目录中安装依赖
3. 安装 ElasticSearch、InfluxDB、PostgreSQL
4. 修改 server/package.json 以及 server/database/ 中 sql 文件的账户信息
5. 回到根目录执行 yarn db:create 和 yarn db:init
6. 开发模式启动前后台执行 yarn dev

## 文档

-   [在线文档](https://gallant-carson-ad89bb.netlify.com/)
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

## 正在开发的功能

-   容器部署
-   K8S
-   缓存模块
-   短信模块
-   邮件模块
-   消息队列
-   ...

## 协议

Nestify is [MIT licensed](LICENSE).
