/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  title: 'Nestify',
  tagline: 'Nest.js 开源生态系统',
  url: 'https://nestify-netlify.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'Nestify', // Usually your GitHub org/user name.
  projectName: 'Nestify', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'Nestify',
      logo: {
        alt: 'Nestify Logo',
        src: 'img/logo.svg',
      },
      links: [
        { to: 'docs/doc1', label: '文档', position: 'left' },
        { to: 'blog', label: '博客', position: 'left' },
        {
          href: 'https://github.com/ZhiXiao-Lin/nestify',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        // {
        //   title: '文档',
        //   items: [
        //     {
        //       label: '文档',
        //       to: 'docs',
        //     },
        //   ],
        // },
        // {
        //   title: '动态',
        //   items: [
        //     {
        //       label: '博客',
        //       to: 'blog',
        //     },
        //   ],
        // },
      ],
      logo: {
        alt: 'Nestify Logo',
        src: 'img/logo-h.png',
      },
      copyright: `Copyright © ${new Date().getFullYear()} Nestify Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
