# 应用图标

## 图标文件说明

- `icon.svg` - 矢量源文件
- `icon.ico` - Windows 应用图标（需要生成）

## 生成 .ico 文件

### 方法 1：使用在线工具（推荐）

1. 访问 https://convertio.co/svg-ico/ 或 https://cloudconvert.com/svg-to-ico
2. 上传 `icon.svg` 文件
3. 选择输出尺寸：256x256（或多尺寸：16, 32, 48, 256）
4. 下载生成的 `icon.ico` 文件到此目录

### 方法 2：使用 ImageMagick（命令行）

```bash
# 安装 ImageMagick 后运行
magick convert icon.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### 方法 3：使用 npm 包

```bash
# 安装 png-to-ico
npm install -g png-to-ico

# 先将 SVG 转换为 PNG，然后转换为 ICO
# 可以使用 sharp 或其他工具
```

## 图标规格

- 格式：ICO（Windows 图标格式）
- 推荐尺寸：256x256, 128x128, 64x64, 48x48, 32x32, 16x16
- 用途：Windows 应用程序图标、任务栏图标、桌面快捷方式图标
