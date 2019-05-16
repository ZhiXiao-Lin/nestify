export const contentCategories = [{
    value: 'CT_LIST',
    text: '资讯'
}, {
    value: 'CT_LIST',
    text: '轮播'
}, {
    value: 'CT_LIST',
    text: '关于我们'
}];

export const contentMenu = {
    news: {
        label: '资讯管理',
        rootPath: '资讯',
        categories: ['CT_LIST']
    },
    about: {
        label: '关于我们',
        rootPath: '关于我们',
        categories: ['CT_LIST']
    }, 
    slider: {
    	label: '轮播管理', 
    	rootPath: '轮播', 
    	categories: ['CT_LIST']
    }
};