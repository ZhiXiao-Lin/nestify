English | [简体中文](./README.md)

<h1 align="center">Antd Pro Mobx</h1>

[Ant Design Pro](https://pro.ant.design/index-cn) lite base on Mobx

[Preview](http://gongzhen.coding.me)

## Available scripts
* `npm run mock`: mock API by [rap2](http://rap2.taobao.org/) .
* `npm run dev`:  Runs the app in development mode. To use the real world API，please change ‘http://pre.xxx.com’ (line 27th. of web pack.dev.js) to your project API url.
* `npm run build`: Builds the app for production to the `dist` folder. The `dist` folder is ready for deployment.
* `npm run doc`:  Previews the demo.

## Why Antd Pro Mobx?
[Antd Pro](https://pro.ant.design/index-cn) is a large and complete, highly-encapsulated scaffold, which helps  developers to do lots of basic works, but it increases the costs per learner inevitably. The more so, its dependences on `dva` and `umi` which limited developers technologies stacks, also developers can't configure webpack directly. I build Antd Pro Mobx to resolve the issues, it simplified the login and registration process, replaced `dva` to `mobx` which is based on class, made the code structure clearer and easier to organize, removed the underlying `umi`, developers can configure webpack directly and flexiblely, it reduces the learning costs. Developers can get started quickly and focus on business development more deeply. And built-in alliance statistics, you can get the basic situation of your app, and use advanced analysis, clustering, portrait, push and other advanced functions. At present, there are two enterprises have implemented Antd Pro Mobx.

## Users of Antd Pro Mobx

1. You don't like `dva`,  you prefer to use `mobx` which is based on class.
2. You are not familiar with `umi`,  and wanna configure webpack directly.
3. You want to build an online app which only includes a desktop version ASAP.

## What has been removed as Antd Pro？
1. replaced `dva` to `mobx` .
2. removed `umi`, developers can configure webpack directly.
3. Use [rap2](http://rap2.taobao.org/) for mock data.
4. Removed mobile version.
5. Removed test related code.
6. Removed multiple languages.

>The purpose of this project is to help developers to develop a desktop version app ASAP. You can refer to [Antd Pro](https://pro.ant.design/index-cn) to add what has been removed.

## What has been added as Antd Pro？
1. Replaced css-loader modules to [react-css-modules](https://github.com/gajus/react-css-modules).
2. Added asynchronous routing to optimize the home page.
3. Added OSS upload component to upload files by [STS](https://help.aliyun.com/document_detail/32077.html?spm=a2c4g.11186623.6.788.qrBaau).  You have to purchase STS.
4. Replaced `BizChart` to `highcharts` .
5. Built-in [umeng](https://www.umeng.com/) statistics, Add `page load` event for font-end routing.

## What can be more perfect？
1. This project only support `mobile number+captcha` for user login, you can add more other ways for login, but you have to provide a solution for registration, forgot password and change password.
2. Routes are built in a components, but they are not centralization, you may change them as same as router 3 ( please don't ask me why don't use router 3 directly,  there were no regret medicine to take forever in the world).
3. Though css-loader modules has been replaced to [react-css-modules](https://github.com/gajus/react-css-modules). But there is another better solution which is called [babel-plugin-react-css-modules](https://github.com/gajus/babel-plugin-react-css-modules).
4. Code-splitting solution: synchronous routing and asynchronous routing are both supported now. You can build more solutions for your project.
5. I'd love to have your helping hand on `Antd Pro Mobx`!  Welcome to pull your request.

## Dependences
1. webpack 4
2. router 4
3. react 16
4. mobx 5
5. axios
6. antd + ant-design-pro
7. ali-oss 6

## LICENSE
[MIT](LICENSE)
