import dva from 'dva';
import createLoading from 'dva-loading';

const runtimeDva = window.g_plugins.mergeConfig('dva');
let app = dva({
  history: window.g_history,
  
  ...(runtimeDva.config || {}),
});

window.g_app = app;
app.use(createLoading());
(runtimeDva.plugins || []).forEach(plugin => {
  app.use(plugin);
});

app.model({ namespace: 'authority', ...(require('/Users/lin/code/volunteer/admin/src/models/authority.js').default) });
app.model({ namespace: 'carousel', ...(require('/Users/lin/code/volunteer/admin/src/models/carousel.js').default) });
app.model({ namespace: 'category', ...(require('/Users/lin/code/volunteer/admin/src/models/category.js').default) });
app.model({ namespace: 'content', ...(require('/Users/lin/code/volunteer/admin/src/models/content.js').default) });
app.model({ namespace: 'flow-template', ...(require('/Users/lin/code/volunteer/admin/src/models/flow-template.js').default) });
app.model({ namespace: 'flow', ...(require('/Users/lin/code/volunteer/admin/src/models/flow.js').default) });
app.model({ namespace: 'global', ...(require('/Users/lin/code/volunteer/admin/src/models/global.js').default) });
app.model({ namespace: 'organization', ...(require('/Users/lin/code/volunteer/admin/src/models/organization.js').default) });
app.model({ namespace: 'role', ...(require('/Users/lin/code/volunteer/admin/src/models/role.js').default) });
app.model({ namespace: 'search', ...(require('/Users/lin/code/volunteer/admin/src/models/search.js').default) });
app.model({ namespace: 'service-category', ...(require('/Users/lin/code/volunteer/admin/src/models/service-category.js').default) });
app.model({ namespace: 'service', ...(require('/Users/lin/code/volunteer/admin/src/models/service.js').default) });
app.model({ namespace: 'setting', ...(require('/Users/lin/code/volunteer/admin/src/models/setting.js').default) });
app.model({ namespace: 'notices', ...(require('/Users/lin/code/volunteer/admin/src/models/sockets/notices.js').default) });
app.model({ namespace: 'status', ...(require('/Users/lin/code/volunteer/admin/src/models/sockets/status.js').default) });
app.model({ namespace: 'user', ...(require('/Users/lin/code/volunteer/admin/src/models/user.js').default) });
app.model({ namespace: 'users', ...(require('/Users/lin/code/volunteer/admin/src/models/users.js').default) });
