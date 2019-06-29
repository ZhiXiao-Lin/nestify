'use strict';


customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">Nestify</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="请输入查询关键字"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>入门指南</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>概述
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>手册
                            </a>
                        </li>
                        <li class="link">
                            <a href="license.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>LICENSE
                            </a>
                        </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-toggle="collapse" ${ isNormalMode ?
                                'data-target="#modules-links"' : 'data-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">模块列表</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse" ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/ApiModule.html" data-type="entity-link">ApiModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link">AppModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                        'data-target="#injectables-links-module-AppModule-95cc4f3b328693936d49921bf313e262"' : 'data-target="#xs-injectables-links-module-AppModule-95cc4f3b328693936d49921bf313e262"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>可注入的</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-95cc4f3b328693936d49921bf313e262"' :
                                        'id="xs-injectables-links-module-AppModule-95cc4f3b328693936d49921bf313e262"' }>
                                        <li class="link">
                                            <a href="injectables/Seed.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>Seed</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CommonModule.html" data-type="entity-link">CommonModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                        'data-target="#injectables-links-module-CommonModule-e3fe91967c145ce872ed8587687bfa16"' : 'data-target="#xs-injectables-links-module-CommonModule-e3fe91967c145ce872ed8587687bfa16"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>可注入的</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CommonModule-e3fe91967c145ce872ed8587687bfa16"' :
                                        'id="xs-injectables-links-module-CommonModule-e3fe91967c145ce872ed8587687bfa16"' }>
                                        <li class="link">
                                            <a href="injectables/ApplyVolunteerFlow.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>ApplyVolunteerFlow</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AuthorityService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>AuthorityService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/CarouselService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>CarouselService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/CategoryService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>CategoryService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/CommonService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>CommonService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ContentService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>ContentService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/FlowService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>FlowService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/FlowTemplateService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>FlowTemplateService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ImportService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>ImportService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtStrategy.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>JwtStrategy</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/OrganizationService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>OrganizationService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/RoleService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>RoleService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SearchService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>SearchService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ServiceCategoryService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>ServiceCategoryService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ServiceService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>ServiceService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SettingService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>SettingService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/UserService.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>UserService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WorkOrderFlow.html"
                                                data-type="entity-link" data-context="sub-entity" data-context-id="modules" }>WorkOrderFlow</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/SSRModule.html" data-type="entity-link">SSRModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ?
                                            'data-target="#controllers-links-module-SSRModule-f233649ec45dcde0db8270d2c7549124"' : 'data-target="#xs-controllers-links-module-SSRModule-f233649ec45dcde0db8270d2c7549124"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SSRModule-f233649ec45dcde0db8270d2c7549124"' :
                                            'id="xs-controllers-links-module-SSRModule-f233649ec45dcde0db8270d2c7549124"' }>
                                            <li class="link">
                                                <a href="controllers/IndexController.html"
                                                    data-type="entity-link" data-context="sub-entity" data-context-id="modules">IndexController</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#classes-links"' :
                            'data-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>类列表</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse" ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/ApplyVolunteerDto.html" data-type="entity-link">ApplyVolunteerDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/Authority.html" data-type="entity-link">Authority</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthorityController.html" data-type="entity-link">AuthorityController</a>
                            </li>
                            <li class="link">
                                <a href="classes/Base.html" data-type="entity-link">Base</a>
                            </li>
                            <li class="link">
                                <a href="classes/BaseFlow.html" data-type="entity-link">BaseFlow</a>
                            </li>
                            <li class="link">
                                <a href="classes/BaseService.html" data-type="entity-link">BaseService</a>
                            </li>
                            <li class="link">
                                <a href="classes/Carousel.html" data-type="entity-link">Carousel</a>
                            </li>
                            <li class="link">
                                <a href="classes/CarouselController.html" data-type="entity-link">CarouselController</a>
                            </li>
                            <li class="link">
                                <a href="classes/Category.html" data-type="entity-link">Category</a>
                            </li>
                            <li class="link">
                                <a href="classes/CategoryController.html" data-type="entity-link">CategoryController</a>
                            </li>
                            <li class="link">
                                <a href="classes/Content.html" data-type="entity-link">Content</a>
                            </li>
                            <li class="link">
                                <a href="classes/ContentController.html" data-type="entity-link">ContentController</a>
                            </li>
                            <li class="link">
                                <a href="classes/ContextTrace.html" data-type="entity-link">ContextTrace</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateContentDto.html" data-type="entity-link">CreateContentDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/Engine.html" data-type="entity-link">Engine</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExcelHelper.html" data-type="entity-link">ExcelHelper</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExceptionsFilter.html" data-type="entity-link">ExceptionsFilter</a>
                            </li>
                            <li class="link">
                                <a href="classes/Flow.html" data-type="entity-link">Flow</a>
                            </li>
                            <li class="link">
                                <a href="classes/FlowController.html" data-type="entity-link">FlowController</a>
                            </li>
                            <li class="link">
                                <a href="classes/FlowTemplate.html" data-type="entity-link">FlowTemplate</a>
                            </li>
                            <li class="link">
                                <a href="classes/FlowTemplateController.html" data-type="entity-link">FlowTemplateController</a>
                            </li>
                            <li class="link">
                                <a href="classes/IO.html" data-type="entity-link">IO</a>
                            </li>
                            <li class="link">
                                <a href="classes/Logger.html" data-type="entity-link">Logger</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginController.html" data-type="entity-link">LoginController</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginDto.html" data-type="entity-link">LoginDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/MQ.html" data-type="entity-link">MQ</a>
                            </li>
                            <li class="link">
                                <a href="classes/Notice.html" data-type="entity-link">Notice</a>
                            </li>
                            <li class="link">
                                <a href="classes/Organization.html" data-type="entity-link">Organization</a>
                            </li>
                            <li class="link">
                                <a href="classes/OrganizationController.html" data-type="entity-link">OrganizationController</a>
                            </li>
                            <li class="link">
                                <a href="classes/PasswordDto.html" data-type="entity-link">PasswordDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/Qiniu.html" data-type="entity-link">Qiniu</a>
                            </li>
                            <li class="link">
                                <a href="classes/Role.html" data-type="entity-link">Role</a>
                            </li>
                            <li class="link">
                                <a href="classes/RoleController.html" data-type="entity-link">RoleController</a>
                            </li>
                            <li class="link">
                                <a href="classes/SearchController.html" data-type="entity-link">SearchController</a>
                            </li>
                            <li class="link">
                                <a href="classes/Service.html" data-type="entity-link">Service</a>
                            </li>
                            <li class="link">
                                <a href="classes/ServiceCategory.html" data-type="entity-link">ServiceCategory</a>
                            </li>
                            <li class="link">
                                <a href="classes/ServiceCategoryController.html" data-type="entity-link">ServiceCategoryController</a>
                            </li>
                            <li class="link">
                                <a href="classes/ServiceController.html" data-type="entity-link">ServiceController</a>
                            </li>
                            <li class="link">
                                <a href="classes/Setting.html" data-type="entity-link">Setting</a>
                            </li>
                            <li class="link">
                                <a href="classes/SettingController.html" data-type="entity-link">SettingController</a>
                            </li>
                            <li class="link">
                                <a href="classes/SMS.html" data-type="entity-link">SMS</a>
                            </li>
                            <li class="link">
                                <a href="classes/StatusTask.html" data-type="entity-link">StatusTask</a>
                            </li>
                            <li class="link">
                                <a href="classes/StorageController.html" data-type="entity-link">StorageController</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateContentDto.html" data-type="entity-link">UpdateContentDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/User.html" data-type="entity-link">User</a>
                            </li>
                            <li class="link">
                                <a href="classes/UserController.html" data-type="entity-link">UserController</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#injectables-links"' :
                                'data-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>可注入的</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/Seed.html" data-type="entity-link">Seed</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#interfaces-links"' :
                            'data-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>接口</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse" ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/IFlow.html" data-type="entity-link">IFlow</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-toggle="collapse" ${ isNormalMode ? 'data-target="#miscellaneous-links"'
                            : 'data-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>其他</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse" ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">枚举列表</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">函数</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">变量</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>文档概览</a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});