# 雨声提醒 - 启动文档

## 环境准备

```powershell
# 1. 设置镜像（国内必需）
$env:PUB_HOSTED_URL = "https://pub.flutter-io.cn"
$env:FLUTTER_STORAGE_BASE_URL = "https://storage.flutter-io.cn"

# 2. 设置 Java 路径（Android 构建需要）
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;C:\flutter\bin;$env:Path"

# 3. 设置 Android SDK 路径
$env:ANDROID_HOME = "C:\Users\Administrator\AppData\Local\Android\sdk"
```

---

## 方式一：Web 版（最快）

**1. 安装依赖**

```powershell
cd E:\code\rain_reminder
flutter pub get
```

**2. 编译**

```powershell
flutter build web --release
```

**3. 启动服务**

```powershell
cd build\web
python -m http.server 8080
```

**4. 打开浏览器**

访问 `http://localhost:8080`

> 语音播报依赖浏览器 SpeechSynthesis API，Chrome/Edge 均支持。

---

## 方式二：Android APK（手机安装）

**1. 安装依赖**

```powershell
cd E:\code\rain_reminder
flutter pub get
```

**2. 构建拆分 APK（正式签名 + 压缩混淆）**

```powershell
flutter build apk --release --split-per-abi
```

**3. 输出位置**

```
build\app\outputs\flutter-apk\
  ├── app-arm64-v8a-release.apk   (18 MB, 推荐)
  ├── app-armeabi-v7a-release.apk (16 MB, 老手机)
  └── app-x86_64-release.apk      (19 MB, 模拟器)
```

**4. 安装**

将 `app-arm64-v8a-release.apk` 传到手机，点击安装即可。

> 首次启动可能被拦截，需要在手机「设置 → 安全 → 允许安装未知应用」中放行。

---

## 方式三：Windows 桌面（exe）

**前置条件**：
- Visual Studio 2022 Build Tools（C++ 桌面开发工作负载）
- Windows 开发者模式已开启

```powershell
flutter build windows --release
# 输出: build\windows\x64\runner\Release\rain_reminder.exe
```

---

## 方式四：开发调试

**Web 热更新（改代码即时刷新）**

```powershell
cd E:\code\rain_reminder
flutter run -d chrome
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
