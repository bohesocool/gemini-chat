// 运行时配置注入
// Docker 启动时会替换这个文件中的占位符
(function() {
  var password = '__AUTH_PASSWORD__';
  window.__APP_CONFIG__ = {
    AUTH_PASSWORD: password === '__AUTH_PASSWORD__' ? undefined : password
  };
})();
