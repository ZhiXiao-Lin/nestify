import axios from 'axios';

const BaseUrl='./mock/homeData/';
const getHome=()=>{
    return axios.get(BaseUrl+'home.json').then(res=>{
        return res.data
    })
}

const getArticleList=()=>{
    return axios.get(BaseUrl+'articleList.json').then(res=>{
        return res.data
    })
}

export { getHome,getArticleList }