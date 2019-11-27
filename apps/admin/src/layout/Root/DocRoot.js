import React from 'react';
import { hot } from 'react-hot-loader';
import { BrowserRouter, Route, Redirect, Switch } from 'react-router-dom';
import { Provider } from 'mobx-react';
import App from 'layout/App';
import store from 'store';
import { LocaleProvider } from 'antd';
import zh_CN from 'antd/lib/locale-provider/zh_CN';
import 'moment/locale/zh-cn';

import Home from 'page/Home';
import Login from 'page/Login';
import Account from 'page/Account';
import BasicForm from 'page/BasicForm';
import StepForm from 'page/StepForm';
import SearchList from 'page/SearchList';
import DataReport from 'page/DataReport';
import Success from 'page/Result/Success';
import Error from 'page/Result/Error';
import E403 from 'page/403';
import E404 from 'page/404';
import E500 from 'page/500';

import 'antd/dist/antd.css';
import 'ant-design-pro/dist/ant-design-pro.css';
import 'stylesheet/cantd.less';
import 'stylesheet/app.less';

const Root = () => (
  <Provider {...store}>
    <LocaleProvider locale={zh_CN}>
      <BrowserRouter>
        <React.Fragment>
          <Switch>
            <Route exact path="/login" component={Login} />
            <App>
              <Switch>
                <Route
                  exact
                  path="/project/usercenter/account"
                  component={Account}
                />

                <Route exact path="/project" component={Home} />

                <Route
                  exact
                  path="/project/form/basic/:id?"
                  component={BasicForm}
                />

                <Route
                  exact
                  path="/project/form/step/:id?"
                  component={StepForm}
                />

                <Route
                  exact
                  path="/project/list/search"
                  component={SearchList}
                />

                <Route
                  exact
                  path="/project/datareport/:id"
                  component={DataReport}
                />

                <Route
                  exact
                  path="/project/form/step/datareport/:id"
                  component={DataReport}
                />

                <Route
                  exact
                  path="/project/result/success"
                  component={Success}
                />
                <Route
                  exact
                  path="/project/result/error"
                  component={Error}
                />

                <Route
                  exact
                  path="/project/exception/403"
                  component={E403}
                />
                <Route
                  exact
                  path="/project/exception/404"
                  component={E404}
                />
                <Route
                  exact
                  path="/project/exception/500"
                  component={E500}
                />

                <Redirect exact from="/" to="/project" />

                <Route
                  component={E404}
                />
              </Switch>
            </App>
          </Switch>
        </React.Fragment>
      </BrowserRouter>
    </LocaleProvider>
  </Provider>
);

export default hot(module)(Root);
