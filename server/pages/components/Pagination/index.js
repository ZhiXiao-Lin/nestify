import { Pagination, LocaleProvider } from 'antd';
import zhCN from 'antd/lib/locale-provider/zh_CN';
import './index.scss';

function itemRender(current, type, originalElement) {
  if (type === 'prev') {
    return <a>上一页</a>;
  } if (type === 'next') {
    return <a>下一页</a>;
  }
  return originalElement;
}

export default (props) => {
	const { pageSize, width } = props;
	return (
		<LocaleProvider locale={zhCN}>
			<div id="pagination" style={{ width: width || "100%" }}>
				<Pagination
					{...props}
					showQuickJumper
					itemRender={itemRender}
				/>
			</div>
		</LocaleProvider>
	);
}