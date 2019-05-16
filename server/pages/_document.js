import Document, { Head, Main, NextScript } from 'next/document';

export default class extends Document {
	static async getInitialProps(ctx) {
		const initialProps = await Document.getInitialProps(ctx);

		return { ...initialProps, ...ctx.query };
	}

	render() {
		return (
			<html>
				<Head>
					<link rel="icon" href="/static/favicon.ico" type="image/x-icon" />
					<link rel="shortcut icon" href="/static/favicon.ico" type="image/x-icon" />
					<link rel="stylesheet" href="http://at.alicdn.com/t/font_1195797_5qe2hwcsbjx.css"/>
				</Head>
				<body>
					<Main />
					<NextScript />
				</body>
			</html>
		);
	}
}
