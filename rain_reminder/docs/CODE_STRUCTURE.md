# 雨声提醒 — 代码结构文档

## 项目总览

```
rain_reminder/                  # Flutter 跨平台项目
├── lib/                        # Dart 业务代码
│   ├── main.dart               # 应用入口：初始化所有服务 → 启动
│   ├── app.dart                # MaterialApp：路由 + 主题配置
│   ├── core/                   # 基础层：无业务逻辑的纯工具
│   │   ├── constants/          # 常量定义
│   │   ├── theme/              # 浅色/深色主题
│   │   └── utils/              # 工具函数 + 时间滚轮组件
│   ├── data/                   # 数据层：模型 + 服务
│   │   ├── models/             # 数据模型（4 个）
│   │   └── services/           # 业务服务（7 个）
│   └── presentation/           # 表现层：页面 + 状态 + 组件
│       ├── providers/          # Riverpod 状态管理（4 个）
│       ├── screens/            # 三个页面
│       └── widgets/            # 可复用组件（4 个）
├── assets/                     # 静态资源
│   ├── i18n/zh-cn/             # 中文词条 JSON（4 个）
│   ├── audio/                  # 白噪音音频文件（4 个）
│   └── icon/                   # App 图标源文件
├── android/                    # Android 原生配置
├── windows/                    # Windows 原生配置
├── web/                        # Web 配置
├── docs/                       # 文档
│   ├── requirement.md          # 需求文档
│   ├── STARTUP.md              # 启动文档
│   ├── CODE_STRUCTURE.md       # 本文档
│   └── DEVELOPMENT_SUMMARY.md  # 开发总结
└── pubspec.yaml                # Flutter 依赖声明
```

---

## 分层架构

```
┌──────────────────────────────────────────┐
│               main.dart                  │  ← 入口：初始化所有服务
├──────────────────────────────────────────┤
│  presentation/                           │
│  ├── screens/      (页面 UI)            │  ← 用户可见
│  ├── widgets/      (复用组件)           │
│  └── providers/    (Riverpod 状态)      │  ← 连接数据与 UI
├──────────────────────────────────────────┤
│  data/                                   │
│  ├── models/       (数据结构)           │  ← 纯数据类
│  └── services/     (业务逻辑)           │  ← API/存储/TTS/通知
├──────────────────────────────────────────┤
│  core/              (基础设施)          │  ← 常量/主题/工具
└──────────────────────────────────────────┘
```

**数据流方向**：`services → providers → screens/widgets`

---

## 核心文件详解

### 1. 入口与路由

| 文件 | 职责 |
|------|------|
| `lib/main.dart` | 启动入口：初始化 Hive 存储 → 消息加载器 → 数据迁移 → 自动定位 → 通知/TTS → 注入 ProviderScope → 启动 App |
| `lib/app.dart` | MaterialApp：路由表 `/`(首页) `/reminder`(提醒管理) `/settings`(设置)，主题切换 |

### 2. 数据模型（data/models/）

| 文件 | 关键字段 | 说明 |
|------|----------|------|
| `weather.dart` | temperature, condition, pm25, isRaining, rainIn2Hours, tempDrop, yesterdayTemp | 天气数据 + `getWeatherTips()` 生成关怀提示 |
| `reminder_node.dart` | id, name, hour, minute, enabled, customMessage, repeatDays | 提醒节点 + `isDueOn(date)` 判断某日是否触发 |
| `app_settings.dart` | apiKey, cityCode, messageStyle, voiceEnabled, speechRate | 用户偏好设置 |
| `city.dart` | id, name, code | 城市信息（经纬度坐标） |

### 3. 业务服务（data/services/）

| 文件 | 核心方法 | 依赖 |
|------|----------|------|
| `weather_service.dart` | `getCurrentWeather()` / `getMinutelyRain()` / `searchCity()` | Dio → 和风天气 / Open-Meteo API，并行拉取4个数据源 |
| `storage_service.dart` | `getReminders()` / `saveReminder()` / `migrateIfNeeded()` | Hive → 本地 JSON 持久化，版本号迁移机制 |
| `message_loader.dart` | `load(locale)` / `getMessage(category, style)` / `getPresets()` | rootBundle → 读取 assets/i18n JSON，洗牌去重队列 |
| `notification_service.dart` | `showReminderNotification()` / `scheduleReminder()` | flutter_local_notifications → 系统推送 |
| `tts_service.dart` | `speak(text, rate)` / `stop()` | flutter_tts → 跨平台语音合成 |
| `locator_service.dart` | `getCurrentLocation()` | geolocator → GPS → IP降级 → 反向地理编码 |
| `audio_service.dart` | `play(key)` / `stop()` | audioplayers → 循环播放本地白噪音 |

### 4. 状态管理（presentation/providers/）

| 文件 | Provider | 管理的状态 | 消费方 |
|------|----------|------------|--------|
| `weather_provider.dart` | `weatherProvider` | `WeatherData?` | 首页天气卡片、语音播报 |
| `reminder_provider.dart` | `reminderProvider` + `messageLoaderProvider` | `List<ReminderNode>` | 首页提醒列表、提醒管理页、定时触发逻辑 |
| `settings_provider.dart` | `settingsProvider` + `storageServiceProvider` | `AppSettings` | 所有页面的开关/配置 |
| `theme_provider.dart` | `themeProvider` | `ThemeMode` | 全局主题切换 |

### 5. 页面（presentation/screens/）

| 文件 | 功能要点 |
|------|----------|
| `home/home_screen.dart` | 问候语 → 天气卡片 → 倒计时 → 提醒列表 → 快捷按钮；精确定时器 + SnackBar 延后 |
| `reminder/reminder_screen.dart` | 提醒 CRUD 列表；新增/编辑弹窗含工作日选择器 + 时间滚轮 |
| `settings/settings_screen.dart` | 城市定位 → API 配置 → 消息风格 → 通知/语音开关 → 语速 → 白噪音 → 外观 |

### 6. 复用组件（presentation/widgets/）

| 文件 | 说明 |
|------|------|
| `weather_card.dart` | 天气信息卡片：城市/温度/湿度/风力 + 天气关怀标签 + 缓存时间 |
| `countdown_timer.dart` | 实时倒计时显示（下次提醒时间） |
| `reminder_card.dart` | 提醒缩略卡片（首页横向滚动列表），点击弹出编辑弹窗 |
| `style_toggle.dart` | 毒鸡汤/暖心风格切换组件 |

---

## 关键关系图

```
main.dart
  ├── storageService ──────── Hive 本地存储
  ├── messageLoader ──────── assets/i18n/*.json
  ├── notificationService ── flutter_local_notifications
  ├── ttsService ──────────── flutter_tts
  ├── locatorService ──────── geolocator → Open-Meteo geocoding
  └── app.dart
        ├── HomeScreen
        │     ├── WeatherCard ── weatherProvider → weatherService → Open-Meteo
        │     ├── CountdownTimer ── reminderProvider
        │     ├── ReminderCard ── reminderProvider → onTap → editDialog
        │     └── 定时器 ── 精确计算下一提醒 → triggerReminder → ttsService + notificationService
        ├── ReminderScreen
        │     └── 新增/编辑弹窗 ── reminderProvider → storageService
        └── SettingsScreen
              ├── 城市对话框 ── locatorService
              ├── 语音测试 ── ttsService
              └── 白噪音 ── audioService
```

---

## 数据存储格式

**Hive Box 结构**：

| Box | Key | Value |
|-----|-----|-------|
| `settings` | `app_settings` | AppSettings → JSON |
| `settings` | `weather_cache` | 最近天气 → JSON (含 `_cachedAt` 时间戳) |
| `settings` | `_storageVersion` | int (当前=2) |
| `reminders` | `<uuid>` | ReminderNode → JSON |
| `cities` | `<uuid>` | City → JSON |

---

## 平台适配

| 功能 | Android | Windows | Web |
|------|---------|---------|-----|
| 定位 | GPS 原生 | IP 降级 | 浏览器授权 |
| 语音 | 系统 TTS | 系统 TTS | flutter_tts Web 实现 |
| 通知 | 系统通知栏 | 系统通知 | 有限支持 |
| 后台 | Workmanager | 前台运行 | 页面内定时器 |
| 白噪音 | audioplayers | audioplayers | audioplayers Web |
