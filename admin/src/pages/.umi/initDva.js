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

app.model({ namespace: 'applications', ...(require('D:/code/nestify/admin/src/models/applications.js').default) });
app.model({ namespace: 'bills', ...(require('D:/code/nestify/admin/src/models/bills.js').default) });
app.model({ namespace: 'contents', ...(require('D:/code/nestify/admin/src/models/contents.js').default) });
app.model({ namespace: 'dbops', ...(require('D:/code/nestify/admin/src/models/dbops.js').default) });
app.model({ namespace: 'global', ...(require('D:/code/nestify/admin/src/models/global.js').default) });
app.model({ namespace: 'orders', ...(require('D:/code/nestify/admin/src/models/orders.js').default) });
app.model({ namespace: 'organizations', ...(require('D:/code/nestify/admin/src/models/organizations.js').default) });
app.model({ namespace: 'products', ...(require('D:/code/nestify/admin/src/models/products.js').default) });
app.model({ namespace: 'projects', ...(require('D:/code/nestify/admin/src/models/projects.js').default) });
app.model({ namespace: 'setting', ...(require('D:/code/nestify/admin/src/models/setting.js').default) });
app.model({ namespace: 'stocks', ...(require('D:/code/nestify/admin/src/models/stocks.js').default) });
app.model({ namespace: 'transactions', ...(require('D:/code/nestify/admin/src/models/transactions.js').default) });
app.model({ namespace: 'user', ...(require('D:/code/nestify/admin/src/models/user.js').default) });
app.model({ namespace: 'users', ...(require('D:/code/nestify/admin/src/models/users.js').default) });
