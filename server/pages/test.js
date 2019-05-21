import React, { Component } from 'react';
import { withRouter } from 'next/router';

import BaseLayout from './layouts/BaseLayout';
import GlobalContext from './contexts/GlobalContext';

import './styles/index.scss';

@withRouter
export default class extends Component {
    renderHandler = () => (context) => {
        console.log(context);

        return (
            <div>

            </div>
        );
    }
    render() {
        return (
            <BaseLayout>
                <GlobalContext.Consumer>
                    {this.renderHandler()}
                </GlobalContext.Consumer>
            </BaseLayout>
        );
    }
}
