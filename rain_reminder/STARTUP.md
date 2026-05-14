# 雨声提醒 - 启动文档

---

## 方式一：Windows 直接启动（推荐，零依赖）

**直接使用发行版，复制到任意 PC 运行：**

```
dist\windows\rain_reminder.exe          ← 双击启动
dist\windows\run.bat                    ← 备用启动
```

`dist/windows/` 目录已包含全部运行时依赖（Flutter 引擎、VC++ 运行时、所有插件 DLL），复制到任意 Windows 电脑双击 exe 即可运行，无需安装任何环境。

**重新构建并打包发行版（修改代码后）**：

```powershell
$env:PUB_HOSTED_URL = "https://pub.flutter-io.cn"
$env:FLUTTER_STORAGE_BASE_URL = "https://storage.flutter-io.cn"
cd E:\code\rain_reminder
flutter build windows --release
# 输出: build\windows\x64\runner\Release\rain_reminder.exe
```

---

## 方式二：Android APK（手机安装）

**构建命令**：

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;C:\flutter\bin;$env:Path"
$env:ANDROID_HOME = "C:\Users\Administrator\AppData\Local\Android\sdk"
$env:PUB_HOSTED_URL = "https://pub.flutter-io.cn"
$env:FLUTTER_STORAGE_BASE_URL = "https://storage.flutter-io.cn"

cd E:\code\rain_reminder
flutter pub get
flutter build apk --release --split-per-abi
```

**输出**：

```
build\app\outputs\flutter-apk\
  ├── app-arm64-v8a-release.apk    (20MB, 绝大多数手机)
  ├── app-armeabi-v7a-release.apk  (17MB, 老款手机)
  └── app-x86_64-release.apk       (21MB, 模拟器)
```

将 `app-arm64-v8a-release.apk` 传手机安装。首次安装需在手机设置中允许「安装未知应用」。

---

## 方式三：Web 版（浏览器）

**构建命令**：

```powershell
$env:PUB_HOSTED_URL = "https://pub.flutter-io.cn"
$env:FLUTTER_STORAGE_BASE_URL = "https://storage.flutter-io.cn"

cd E:\code\rain_reminder
flutter pub get
flutter build web --release
```

**启动**：

```powershell
cd build\web
python -m http.server 8080
# 浏览器打开 http://localhost:8080
```

---

## 环境依赖清单

| 组件 | 路径/版本 |
|------|-----------|
| Flutter SDK | `C:\flutter` (3.41.9) |
| Dart SDK | `C:\flutter\bin\cache\dart-sdk` (3.11.5) |
| JDK | `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot` (21) |
| Android SDK | `C:\Users\Administrator\AppData\Local\Android\sdk` |
| Python | `C:\Users\Administrator\AppData\Local\Programs\Python\Python314` (3.14) |
| Git | `C:\Users\Administrator\AppData\Local\GitPortable\bin` (2.47.1) |

---

## 项目目录结构

```
rain_reminder/
├── lib/
│   ├── main.dart                      # 入口
│   ├── app.dart                       # MaterialApp + 路由
│   ├── core/
│   │   ├── constants/                 # 颜色、文案、样式常量
│   │   ├── theme/                     # 浅色/深色主题定义
│   │   └── utils/                     # 时间工具函数
│   ├── data/
│   │   ├── models/                    # 数据模型 (City, Weather, ReminderNode, Settings)
│   │   └── services/                  # 业务服务
│   │       ├── weather_service.dart   # 天气 API (和风/Open-Meteo)
│   │       ├── storage_service.dart   # Hive 本地存储
│   │       ├── notification_service.dart  # 系统通知
│   │       ├── tts_service.dart       # 语音合成
│   │       └── locator_service.dart   # GPS 定位
│   └── presentation/
│       ├── providers/                 # Riverpod 状态管理
│       ├── screens/                   # 三个页面
│       │   ├── home/                  # 首页（天气+提醒）
│       │   ├── reminder/              # 提醒管理
│       │   └── settings/              # 设置
│       └── widgets/                   # 可复用组件
├── android/                           # Android 原生配置
├── web/                               # Web 配置
├── windows/                           # Windows 配置
├── pubspec.yaml                       # Flutter 依赖
└── docs/
    └── requirement.md                 # 需求文档
```

---

## 故障排查

| 问题 | 解决 |
|------|------|
| `flutter: command not found` | 添加 `C:\flutter\bin` 到系统 PATH |
| Gradle 下载失败 | 检查 `android/gradle/wrapper/gradle-wrapper.properties` 是否指向华为云镜像 |
| NDK source.properties 缺失 | 删除 `Android\sdk\ndk\*` 目录后重试 |
| R8 编译报 missing classes | 检查 `android/app/proguard-rules.pro` 的 dontwarn 规则 |
| Web 语音没声音 | 换 Chrome/Edge 浏览器，确认未静音 |
| Android 安装被拦截 | 开启「允许安装未知应用」权限 |
| 首次启动无天气 | 检查浏览器/手机是否授权了位置权限，或手动进设置输入城市 |

## v2.0 新功能

### i18n 词条管理
- 慰问语从代码分离到 `assets/i18n/zh-cn/*.json`
- 加语言只需复制目录翻译 JSON，无需改代码
- 消息内置洗牌去重，单轮不重复

### 自动定位
- 启动时自动获取位置 → 反向解析城市名 → 自动设置
- 手机用 GPS，Windows 用 IP 降级，Web 用浏览器定位

### 时间选择器
- 点击时间 → 弹出滑动滚轮（小时/分钟），桌面手机体验一致

### 数据迁移
- 升级时自动保留用户设置和提醒，字段变更兼容

### App 图标
- 蓝色渐变云雨铃铛图标，`flutter_launcher_icons` 自动生成

## v2.1 新功能

### 天气提示可视化
- 首页天气卡片下方显示天气关怀标签（带伞/戴口罩/降温等）

### 精确提醒
- 定时精度从 30 秒提升到 ±1 秒，减少资源占用

### 离线缓存
- 无网络时显示上次缓存的天气数据，不会空白

### 时间问候语
- 首页顶部根据时段显示不同问候（早上好/中午好/晚上好/夜深了）

### 快捷延后
- 提醒触发时弹出「10分钟后提醒」快捷按钮

### 工作日区分
- 提醒可设置仅在工���日触发，周末自动跳过

### 雨声白噪音
- 设置页可选背景音播放：雨声 / 风声 / 森林 / 流水
