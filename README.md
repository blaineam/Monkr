# DemoPNG-local

本地运行的截图套壳工具，基于 [Monkr](https://github.com/blaineam/Monkr) 改造，专注于手机、平板截图加边框及透明 PNG 导出。

仓库：[heiye07/DemoPNG-local](https://github.com/heiye07/DemoPNG-local)

## 功能

- 上传截图，选择手机或平板设备及配色。
- 支持设备边框、线框、无边框三种样式。
- 无损 PNG 导出，自动裁掉外围透明留白。
- 支持 1×～4× 导出及复制 PNG 到剪贴板。
- 默认保留上传图片原始数据，便于下次继续使用。

## 下载与使用

前往 [Releases](https://github.com/heiye07/DemoPNG-local/releases) 下载。以每次发布实际附带的文件为准。

| 系统 | 文件 | 使用方式 |
| --- | --- | --- |
| Windows x64 | `.exe` 便携版 | 放入可写文件夹，双击运行，无需安装 |
| macOS Apple Silicon | 名称含 `arm64` 的 `.dmg` 或 `.zip` | 打开 DMG 后拖入“应用程序”，或解压 ZIP |
| macOS Intel | 名称含 `x64` 的 `.dmg` 或 `.zip` | 打开 DMG 后拖入“应用程序”，或解压 ZIP |

macOS 已配置打包流程，需在 macOS 环境构建并验证后提供下载。目前未配置 Apple Developer ID 签名和公证，系统可能提示无法验证开发者。

上传截图 → 选择设备和边框 → 选择倍率 → 下载或复制 PNG。提高倍率会增加输出像素，无法恢复原图缺失的细节。

## 数据保存

- Windows：EXE 旁的 `MonkrLitePortableData` 文件夹；迁移时与 EXE 一起复制。
- macOS：`~/Library/Application Support/Monkr Lite`。
- 内部标识与旧数据目录名称继续沿用，便于兼容旧版；显示名称为 DemoPNG-local。
- 基础截图编辑在本地完成；源码中保留的在线图片、字体等功能可能需要联网。

## 本地开发

建议 Node.js 22 和 npm。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。

```sh
npm run check
npm run build
```

分别执行类型与组件检查、静态页面构建。

## 桌面版打包

Windows x64，在 Windows 执行：

```sh
npm run build:portable
```

macOS Apple Silicon 和 Intel，在 macOS 执行：

```sh
npm run build:mac
```

产物位于 `release/`：Windows 为便携 EXE，macOS 为各架构的 DMG 和 ZIP。

GitHub Actions 中手动运行 **Desktop packages** 工作流，可分别在 Windows、macOS 环境构建，再到 Artifacts 下载。该流程不会自动创建公开 Release。正式分发 Mac 版前，需要另行配置签名、公证并完成真机验证。

修改名称、版本、界面或打包配置后，应重新打包；仅重命名旧 EXE 不会更新内部信息。

## 技术与许可

采用 Svelte 5、SvelteKit、TypeScript、Tailwind CSS 与 Electron。源自 Monkr，遵循 [MIT 许可证](LICENSE)。第三方设备素材受各自许可约束。
