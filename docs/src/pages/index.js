import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const features = [
  {
    title: <>开箱即用</>,
    imageUrl: 'img/undraw_operating.svg',
    description: (
      <>
        标准模块开箱即用
      </>
    ),
  },
  {
    title: <>最佳实践</>,
    imageUrl: 'img/undraw_programming.svg',
    description: (
      <>
        借鉴和总结社区最佳实践
      </>
    ),
  },
  {
    title: <>单元测试</>,
    imageUrl: 'img/undraw_testing.svg',
    description: (
      <>
        自动化测试保障模块代码质量
      </>
    ),
  },
];

function Feature({ imageUrl, title, description }) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={classnames('col col--4', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`${siteConfig.title} - Nest.js 开源生态系统`}
      description="Description will go into a meta tag in <head />">
      <header className={classnames('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <iframe src="https://ghbtns.com/github-btn.html?user=ZhiXiao-Lin&repo=nestify&type=star&count=true&size=large" frameborder="0" scrolling="0" width="160px" height="30px"></iframe>
          </div>
        </div>
      </header>
      <main>
        {features && features.length && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export default Home;
