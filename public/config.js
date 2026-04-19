// 运行时配置注入
// Docker 启动时会替换这个文件中的占位符
(function() {
  var passwordHash = '__AUTH_PASSWORD_HASH__';
  var dbEnabled = '__DB_ENABLED__';
  var webdavEnabled = '__WEBDAV_ENABLED__';

  var isPlaceholder = function(val, suffix) {
    return val === '__' + suffix + '__';
  };

  window.__APP_CONFIG__ = {
    AUTH_PASSWORD_HASH: isPlaceholder(passwordHash, 'AUTH_PASSWORD_HASH') ? undefined : passwordHash,
    DB_ENABLED: isPlaceholder(dbEnabled, 'DB_ENABLED') ? 'false' : dbEnabled,
    WEBDAV_ENABLED: isPlaceholder(webdavEnabled, 'WEBDAV_ENABLED') ? 'false' : webdavEnabled
  };
})();
