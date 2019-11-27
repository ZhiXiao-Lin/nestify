import React from 'react';
import loadable from 'react-loadable';
import Loading from 'component/Loading';
import { hot } from 'react-hot-loader';
import { BrowserRouter, Route, Redirect, Switch } from 'react-router-dom';
import { Provider } from 'mobx-react';
import App from 'layout/App';
import store from 'store';
import { LocaleProvider } from 'antd';
import loginUtil from 'util/login';
import zh_CN from 'antd/lib/locale-provider/zh_CN';
import 'moment/locale/zh-cn';

import Home from 'page/Home';

import 'antd/dist/antd.css';
import 'ant-design-pro/dist/ant-design-pro.css';
import 'stylesheet/cantd.less';
import 'stylesheet/app.less';

function getComponentAsync(loader) {
  return loadable({
    loader: () => loader,
    loading: Loading,
    timeout: 10000
  });
}

const Root = () => (
  <Provider {...store}>
    <LocaleProvider locale={zh_CN}>
      <BrowserRouter>
        <React.Fragment>
          <Switch>
            <Route exact path="/login" component={getComponentAsync(import(/* webpackChunkName: "Login" */ 'page/Login'))} />
            {
              loginUtil.isLogin()
                ? (
                  <App>
                    <Switch>
                      <Route exact path="/project/usercenter/account" component={getComponentAsync(import(/* webpackChunkName: "Account" */ 'page/Account'))} />

                      <Route exact path="/project" component={Home} />

                      <Route
                        exact
                        path="/project/form/basic/:id?"
                        component={getComponentAsync(import(/* webpackChunkName: "StepForm" */ 'page/BasicForm'))}
                      />

                      <Route
                        exact
                        path="/project/form/step/:id?"
                        component={getComponentAsync(import(/* webpackChunkName: "StepForm" */ 'page/StepForm'))}
                      />

                      <Route
                        exact
                        path="/project/list/search"
                        component={getComponentAsync(import(/* webpackChunkName: "SearchList" */ 'page/SearchList'))}
                      />

                      <Route
                        exact
                        path="/project/datareport/:id"
                        component={getComponentAsync(import(/* webpackChunkName: "DataReport" */ 'page/DataReport'))}
                      />

                      <Route
                        exact
                        path="/project/form/step/datareport/:id"
                        component={getComponentAsync(import(/* webpackChunkName: "DataReport" */ 'page/DataReport'))}
                      />

                      <Route
                        exact
                        path="/project/result/success"
                        component={getComponentAsync(import(/* webpackChunkName: "SuccessResult" */ 'page/Result/Success'))}
                      />
                      <Route
                        exact
                        path="/project/result/error"
                        component={getComponentAsync(import(/* webpackChunkName: "ErrorResult" */ 'page/Result/Error'))}
                      />

                      <Route
                        exact
                        path="/project/exception/403"
                        component={getComponentAsync(import(/* webpackChunkName: "E403" */ 'page/403'))}
                      />
                      <Route
                        exact
                        path="/project/exception/404"
                        component={getComponentAsync(import(/* webpackChunkName: "E404" */ 'page/404'))}
                      />
                      <Route
                        exact
                        path="/project/exception/500"
                        component={getComponentAsync(import(/* webpackChunkName: "E500" */ 'page/500'))}
                      />

                      <Redirect exact from="/" to="/project" />

                      <Route
                        component={getComponentAsync(import(/* webpackChunkName: "E404" */ 'page/404'))}
                      />
                    </Switch>
                  </App>
                )
                : <Route component={getComponentAsync(import(/* webpackChunkName: "Login" */ 'page/Login'))} />
            }
          </Switch>
        </React.Fragment>
      </BrowserRouter>
    </LocaleProvider>
  </Provider>
);

export default hot(module)(Root);
