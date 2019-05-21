import Document, { Head, Main, NextScript } from 'next/document';
import { withRouter } from 'next/router';

import config from './_config';

@withRouter
export default class extends Document {
	static async getInitialProps(ctx) {
		const initialProps = await Document.getInitialProps(ctx);

		return { ...initialProps, ...ctx.query };
	}

	render() {
		const { data: { siteInfo: { setting, seo } } } = this.props;
		console.log('【】', this.props.data.siteInfo)
		return (
			<html>
				<Head>
					{Object.keys(seo).map((key, i) => (
						<meta key={i} name={key} content={seo[key]} />
					))}
					<meta charset="UTF-8" />
					<meta name="author" content="bruce-zxy" />
					<meta name="contact" content="bruce_zxy@163.com" />
					<meta name="renderer" content="webkit" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1" />
					<meta http-equiv="content-type" content="text/html; charset=UTF-8" />
					<link rel="icon" href="/static/favicon.ico" type="image/x-icon" />
					<link rel="shortcut icon" href="/static/favicon.ico" type="image/x-icon" />
					<link rel="stylesheet" href={`http:${config.ICON_FONT_URL}`} />
				</Head>
				<body>
					<Main />
					<NextScript />
				</body>
			</html>
		);
	}
}
