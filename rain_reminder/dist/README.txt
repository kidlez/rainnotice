雨声提醒 - 发行版
====================

包含所有运行时依赖，复制到任意 Windows 电脑即可运行。

## Windows

进入 `windows/` 目录，双击 `rain_reminder.exe` 或运行 `run.bat`。

```
windows/
├── rain_reminder.exe              ← 双击启动
├── run.bat                       ← 备用启动脚本
├── flutter_windows.dll           ← Flutter 引擎（必需）
├── *.dll                         ← 插件库（必需）
├── vcruntime*.dll / msvcp*.dll   ← VC++ 运行时（必需）
└── data/                         ← 应用资源（必需）
```

> 整个 `windows/` 文件夹必须保持完整，exe 依赖同目录下的 DLL 和 data/。

## Android

将 `android/app-arm64-v8a-release.apk` 传到手机安装。

```
android/
└── app-arm64-v8a-release.apk     ← 传手机安装
```

> 首次安装需在手机「设置 → 安全 → 允许安装未知应用」中放行。
