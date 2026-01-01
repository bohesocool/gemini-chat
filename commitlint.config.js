// commitlint 配置文件
// 使用 Conventional Commits 规范验证提交信息
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 提交类型必须是以下之一
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复 bug
        'docs',     // 文档更新
        'style',    // 代码格式（不影响代码运行的变动）
        'refactor', // 重构（既不是新增功能，也不是修复 bug）
        'perf',     // 性能优化
        'test',     // 测试相关
        'build',    // 构建系统或外部依赖变更
        'ci',       // CI 配置文件和脚本变更
        'chore',    // 其他不修改 src 或测试文件的变更
        'revert',   // 回滚提交
      ],
    ],
    // 提交类型不能为空
    'type-empty': [2, 'never'],
    // 提交主题不能为空
    'subject-empty': [2, 'never'],
    // 提交主题最大长度
    'subject-max-length': [2, 'always', 100],
  },
};
