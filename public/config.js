// 运行时配置注入
// Docker 启动时会替换这个文件中的占位符为密码哈希值
(function() {
  var passwordHash = '__AUTH_PASSWORD_HASH__';
  // 如果占位符没有被替换，说明没有设置环境变量
  var isPlaceholder = passwordHash === '__AUTH_PASSWORD_' + 'HASH__';
  window.__APP_CONFIG__ = {
    // 存储的是哈希值，不是明文密码
    AUTH_PASSWORD_HASH: isPlaceholder ? undefined : passwordHash
  };
})();
