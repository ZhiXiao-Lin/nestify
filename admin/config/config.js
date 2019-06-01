import pageRoutes from './router.config';

export default {
  routes: pageRoutes,
  outputPath: './dist',
  base: '/admin/',
  publicPath: '/admin/',
  treeShaking: true,
  plugins: [
    [
      'umi-plugin-react',
      {
        antd: true,
        dva: true,
        dynamicImport: {
          webpackChunkName: true,
        },
        dll: true,
        title: '方大特钢',
      },
    ],
  ],
};
