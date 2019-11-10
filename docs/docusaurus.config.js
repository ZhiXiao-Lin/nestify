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
    image: 'img/logo.png',
    algolia: {
      apiKey: 'f7b4357852a31c3bb77a522eb85b395e',
      indexName: 'nestify',
      algoliaOptions: {}, // Optional, if provided by Algolia
    },
    navbar: {
      title: 'Nestify',
      logo: {
        alt: 'Nestify Logo',
        src: 'img/logo.svg',
      },
      links: [
        { to: 'docs/introduction', label: '文档', position: 'right' },
        { to: 'blog', label: '博客', position: 'right' },
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
        {
          title: '社区交流',
          items: [
            {
              label: '在线讨论',
              to: 'https://gitter.im/nestify-stack/community',
            },
            {
              label: '常见问题',
              to: 'https://github.com/ZhiXiao-Lin/nestify/issues',
            },
          ],
        },
        {
          title: '赞助',
          items: [
            {
              label: '开源基金会',
              to: 'https://opencollective.com/nestifystack',
            },
          ],
        },
        {
          title: '友情链接',
          items: [
            {
              label: 'Nest.js - 渐进式Node.js框架',
              to: 'https://nestjs.com/',
            },
          ],
        },
      ],
      logo: {
        alt: 'Nestify Logo',
        src: 'img/logo-h.png',
      },
      copyright: `Copyright © ${new Date().getFullYear()} NestifyStack Built with Docusaurus.`,
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
  ]
};
