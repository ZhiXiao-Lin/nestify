import React, { Component } from 'react';
import { withRouter } from 'next/router';
import HomeLayout from './layouts/HomeLayout';
import GlobalContext from './contexts/GlobalContext';
import Home from './home';

@withRouter
export default class extends Component {
    render() {
        return (
            <HomeLayout>
                <Home />
            </HomeLayout>
        );
    }
}
