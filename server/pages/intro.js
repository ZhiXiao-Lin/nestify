import React, { Component } from 'react';
import { withRouter } from 'next/router';

import CommonLayout from './layouts/CommonLayout';
import GlobalContext from './contexts/GlobalContext';

import Menu from './components/Menu';
import TourGuide from './components/TourGuide';
import BreadCrumbs from './components/BreadCrumbs';
import NaviPanel from './components/NaviPanel';
import ImageList from './components/ImageList';
import VideoList from './components/VideoList';
import SceneryList from './components/SceneryList';
import Article from './components/Article';

import config from './_config';

import './styles/introduction.scss';

@withRouter
export default class extends Component {
    constructor(props) {
        super(props)
        this.renderBy = {
            content: this.toRenderContent,
            list: this.toRenderList,
            image: this.toRenderImage,
            video: this.toRenderVideo,
            imageDetail: this.toRenderImageDetail,
            videoDetail: this.toRenderVideoDetail,
        }
    }

    toRenderContent = () => {
        return (
            <Article html={(`
                <img src='/static/introduction.jpg' alt='placeholder+image' />
                <p style="text-indent: 2em;">江西方大钢铁集团有限公司（简称“方大钢铁集团”）是辽宁方大集团实业有限公司（简称“方大集团”）的全资子公司，是一家以钢铁为主业，并成功向汽车弹簧、矿业、国内外贸易、房地产、建筑安装、工程技术等行业多元发展的大型钢铁联合企业，是方大集团战略规划中确定的主营业务板块之一。方大钢铁集团以生产建筑、工业用钢为主，拥有完整的生产线，年产钢能力1600万吨，现有在岗人员2万余人。</p>
                <p style="text-indent: 2em;">方大钢铁集团总部位于江西省南昌市，旗下控股方大特钢科技股份有限公司（上市公司，以下简称“方大特钢”）、江西萍钢实业股份有限公司（以下简称“萍钢公司”）。位列2018年中国企业500强第289位、中国制造业企业500强第127位，并获评中国钢铁企业最高A+(竞争力极强)企业和“钢铁行业改革开放40周年功勋企业”。</p>
                <p style="text-indent: 2em;">方大特钢产品包括汽车零部件用钢和建筑用材，萍钢公司产品涵盖螺纹钢筋、高速线材、小型材、中厚板多个系列，所属企业有萍乡萍钢安源钢铁有限公司、九江萍钢钢铁有限公司等。</p>
                <p style="text-indent: 2em;">方大特钢、萍钢公司均已通过质量、环境、职业健康安全管理体系认证，方大特钢“长力牌”汽车弹簧、“海鸥牌”建筑钢材，萍钢公司“博升牌”建筑钢材获得了国家产品实物质量“金杯奖”。</p>
                <p style="text-indent: 2em;">方大特钢、萍钢公司分别于2009年和2012年由方大集团改制重组，在省委、省政府的正确领导和大力支持下，通过全方位导入方大集团“党建为魂”的企业文化，扎实践行“经营企业一定要对政府有利、对企业有利、对职工有利”的价值观，深入推进精细化管理，均从巨额亏损、濒临死亡中实现“蝶变”重生，综合竞争实力从原来行业后几位迅速跻身于行业前列，企业效益效率不断提升，社会效益更加凸显。</p>
                <p style="text-indent: 2em;">方大特钢近年来净资产收益率、销售利润率、吨钢材盈利水平始终处于行业和行业上市公司中第一方阵，萍钢公司重组后企业连续盈利，且盈利水平行业排名不断上升。尤其是在钢铁行业持续寒冬的严峻形势下，方大钢铁集团发展保持逆势向好。2018年抓住国家供给侧改革、去产能带来的机遇，各项指标更是开创历史新高，全年实现营业收入633.98亿元，利税总额达到174.7亿元，其中利润总额135.95亿元，实现税金38.74亿元，上缴税金84.05亿元。营业收入、利润总额、上缴税金较上年分别增长13.16%、35.49%、102.58%。据中国钢铁工业协会数据显示，2018年，方大钢铁集团利润总额排名同行业企业的第3位。</p>
                <p style="text-indent: 2em;">在党建文化的引领下，方大钢铁集团坚持以人为本，切实让员工充分共享企业发展成果，特别是在前几年行业特别困难的情况下，企业提出并坚持做到“三个不减”（不减一个员工，不减员工一分钱工资，不减员工一分钱福利待遇），没有把一名员工推向社会。方大特钢2018年在岗员工（不含中高层）人均收入达18.7万元，九江钢铁2018年在岗员工（不含中高层）人均收达15.13万元。与此同时，方大钢铁集团执行方大集团推行的免费工作餐、配送手机和补贴话费，员工、员工配偶、员工子女、员工父母医疗资助，员工子女励志奖学金，敬老补助金，方大养老金，基本工资增长，孝敬父母金等福利政策，改制重组以来对员工的上述福利政策投入超过4.2亿元。</p>
                <p style="text-indent: 2em;">方大钢铁集团全面落实绿色发展理念，2016年，主动去铁产能50万吨、钢产能60万吨，同时主动关停了50万吨的焦化厂。方大特钢、萍钢公司均入选国家工信委符合产业规范条件企业名单，企业装备全部符合国家钢铁产业政策要求。2017年以来，瞄准国际先进水平，方大钢铁集团投入30余亿元，全力打造生态森林旅游式工厂，建设国家3A、4A旅游景区。方大特钢、萍钢公司均荣获“全国节能减排突出贡献企业”“全国大气污染减排突出贡献企业”“中国绿色能源十大先锋企业”等多项荣誉称号。</p>
                <p style="text-indent: 2em;">方大钢铁集团积极履行社会责任，致力于回报社会。2013-2018年，平均每年上交税金32.58亿元。改制重组以来向社会捐赠6000余万元，其中方大特钢社会捐赠超过建厂60年的总和。</p>
                <p style="text-indent: 2em;">展望未来，随着供给侧结构性改革的进一步深化，对于实现发展质量蜕变的方大钢铁集团来说，既是挑战，更是机遇，方大钢铁集团将始终遵循国家产业政策，按照“做精、做优、做强、做特”的原则，认真落实“变、干、实”的要求，继续深入对标挖潜，全面推进精细化管理，努力实现吨钢利润率行业第一的目标，团结带领广大员工实现共同富裕率先奔小康！</p>
            `)} />
        )
    }

    toRenderList = () => {
        return <SceneryList />
    }

    toRenderImage = () => {
        return <ImageList />
    }

    toRenderVideo = () => {
        return <VideoList />
    }

    toRenderImageDetail = () => {
        return (
            <Article
                className="image-content"
                title="休闲沙滩车"
                author="admin"
                origin="未知"
                publish="2019-05-22"
                view="225"
                html={`
                    <img src='http://dummyimage.com/800x600/dadada/ffffff.gif&text=PIC' alt='PIC' />
                    <p>工艺品名称：休闲沙滩车</p>
                    <p>作者：刘逢开</p>
                    <p>单位：炼钢厂</p>
                `}
            />
        )
    }

    toRenderVideoDetail = () => {
        return (
            <video controls>
                <source src="/static/root/video/AngryBird.mp4" />
            </video>
        )
    }

    renderHandler = () => ({ siteInfo, type }) => {
        const { setting } = siteInfo;
        console.log(type);
        

        return (
            <div className="hdz-home-body">
                <Menu />
                <BreadCrumbs />
                <div className="introduction-content">
                    <div className="guide-navi">
                        <NaviPanel />
                        <TourGuide.Contact setting={setting} />
                    </div>
                    <div className="intro-main">
                        <div className="main-title">
                            <span>景区介绍</span>
                        </div>
                        <div className={`main-content ${type}-content`}>

                            {this.renderBy[type]()}

                        </div>
                    </div>
                </div>

            </div>
        );
    }
    render() {
        return (
            <CommonLayout>
                <GlobalContext.Consumer>
                    {this.renderHandler()}
                </GlobalContext.Consumer>
            </CommonLayout>
        );
    }
}
