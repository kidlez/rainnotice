# 雨声提醒 — 开发总结

## 项目概况

**项目名**：雨声提醒  
**技术栈**：Flutter 3.41.9 + Dart 3.11.5 + Riverpod + Hive  
**平台**：Windows (exe) / Android (APK) / Web  
**代码量**：26 个 Dart 源文件 + 13 个资源文件  
**开发周期**：v1.0 → v2.0 → v2.1，三轮迭代

---

## 核心功能

- **天气监控**：Open-Meteo 免费 API（无需注册），实时温度/湿度/风力，降水预报，空气质量
- **智能提醒**：自定义时间节点 + 预设模板（吃饭/喝水/运动/休息），工作日区分
- **语音播报**：跨平台 TTS（`flutter_tts`），到点自动播报慰问语 + 天气关怀
- **天气关怀**：带伞 / 戴口罩 / 降温保暖 / 2小时降水预警
- **白噪音**：雨声 / 风声 / 森林 / 流水背景音循环播放
- **自动定位**：启动自动获取位置，GPS → IP 降级

---

## 用户要求优化的核心点

### 第一轮：基础框架搭建

| 用户要求 | 实现方案 | 文件 |
|----------|----------|------|
| 天气降水提示 + 语音播报 | 和风天气 API + flutter_tts | weather_service, tts_service |
| 自定义提醒节点 + 慰问语 | ReminderNode 模型 + 预设模板 | reminder_provider |
| 毒鸡汤 / 暖心双风格切换 | AppSettings.messageStyle 枚举 | settings_provider |
| 支持 iOS + Windows 双平台 | Flutter 跨平台 + platform channels | android/, windows/, web/ |
| 后台静默不打扰 | Workmanager (移动端) / 页面定时器 (Web) | notification_service, home_screen |

### 第二轮：免费天气 + 自动定位

| 用户要求 | 实现方案 | 关键改动 |
|----------|----------|----------|
| **不用填 API Key 也能用** | Open-Meteo 免费天气接入 | `weather_service.dart` 新加 `_tryOpenMeteoFull()`，并行拉4个接口 |
| **空气污染提示戴口罩** | Open-Meteo Air Quality API (`pm2_5`) | `weather_service.dart:_fetchOpenMeteoAirQuality()` |
| **降温提醒（对比昨天）** | `past_days=1` 获取昨日最高温 | `weather_service.dart:_fetchOpenMeteoYesterday()` |
| **2小时降水预测** | `forecast_hours=2` 降水概率 | `weather_service.dart:_fetchOpenMeteoHourlyRain()` |
| **自动获取当前位置** | GIS → IP 降级 → 反向地理编码 | `locator_service.dart` 重构 |
| **首页颜色太亮看不清** | 半透明黑色遮罩 + 深色模式暗色调 | `home_screen.dart` Stack overlay |
| **布局放大留白** | Column + Expanded 自适应高度 | `home_screen.dart` 布局重构 |

### 第三轮：体验优化 v2.0

| 用户要求 | 实现方案 | 关键改动 |
|----------|----------|----------|
| **语音词条外置方便新增** | `assets/i18n/zh-cn/*.json` 4个文件 | 新建 `message_loader.dart` |
| **语音随机不重复** | 洗牌队列：取完一轮重新洗 | `message_loader.dart` 内部 `_decks` |
| **时间选择器不好用** | Cupertino 滑动滚轮替换 clock | 新建 `time_picker.dart`，3 处调用替换 |
| **版本升级保留用户数据** | Hive 版本号 + 逐级迁移 | `storage_service.dart` migrate 体系 |
| **App 图标太简陋** | .NET 绘制蓝色云雨铃铛图标 | `assets/icon/icon.png` + flutter_launcher_icons |
| **语音消息太少重复率高** | 每场景 10 条 × 4 场景 = 80+ 条 | `toxic.json` / `warm.json` / `rain.json` |

### 第四轮：深度优化 v2.1

| 用户要求 | 实现方案 | 关键改动 |
|----------|----------|----------|
| **天气提示可视化（不只语音）** | 天气卡片下方彩色 Chip 标签 | `weather_card.dart` 底部 Wrap |
| **提醒精度从30秒→精确** | 计算下一提醒时间差，一次性 Timer | `home_screen.dart` 定时器重构 |
| **离线也能看天气** | 每次成功拉取自动缓存 JSON | `storage_service.dart` weather_cache |
| **首页加问候语** | 根据时段 7 段不同文案 | `date_utils.dart` getTimeGreeting() |
| **提醒到了能延后** | SnackBar + "10分钟后提醒" + 临时提醒 | `home_screen.dart` _showSnoozeBar() |
| **工作日跳过周末提醒** | repeatDays 位掩码 + 星期勾选器 | `reminder_node.dart` + 两处对话框 |
| **App 叫"雨声"要有雨声** | 白噪音播放器（4 种环境音） | `audio_service.dart` + `settings_screen` WhiteNoiseCard |
| **编译零警告** | 清理 unused import/field，withOpacity 全部替换 | 7 个文件 |
| **Windows 启动零依赖** | VS Build Tools + flutter build windows | 产出独立 exe |

---

## 技术亮点

### 1. 多级天气数据聚合
一次 `fetchWeather()` 并行拉取 4 个 Open-Meteo 接口：实况天气 + 空气质量 + 昨日温度 + 2小时降水概率。使用 `Future.wait()` 并行请求，30 分钟自动刷新。

### 2. 洗牌去重播报
`MessageLoader` 内部为每个场景维护一个洗牌队列。每次取消息从队尾弹出，队列空了重新 shuffle。保证 10 条消息播完前不重复。

### 3. 精确定时器
从 30 秒轮询改为计算下一个提醒精确时间差，设一次性 `Timer`。触发后递归计算下一个。精度 ±2 秒，不浪费 CPU。

### 4. 数据版本迁移
`StorageService` 维护版本号体系。每次模型字段变更只需 `bump 版本号 + 加一个 migrate 方法`，启动时自动补全旧数据缺失字段。

### 5. 位置获取降级链
`GPS → IP (ipapi.co) → IP (ipapi.com)` 三级降级。成功获取后反向地理编码（Open-Meteo geocoding）转为友好城市名。

### 6. 跨平台统一体验
- Windows exe 零依赖双击运行
- Android APK 原生通知 + 后台
- Web 浏览器直接打开
- 时间选择器、语音播报、白噪音三端一致

---

## 构建产物

| 平台 | 文件 | 大小 | 启动方式 |
|------|------|------|----------|
| Windows | `build/windows/x64/runner/Release/rain_reminder.exe` | 33MB（含引擎）| 双击 exe |
| Android | `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk` | 20MB | 传手机安装 |
| Web | `build/web/` | — | `python -m http.server 8080` |

---

## 后续可扩展方向

- [ ] 多语言支持（加 `assets/i18n/en/` 目录即可）
- [ ] 正式签名 APK（生产环境用）
- [ ] 减小 Windows 包体积（移除未用 DLL）
- [ ] 天气动画（雨滴/雪花特效）
- [ ] 提醒历史记录
- [ ] 云端同步设置
- [ ] 第三方天气源自由切换

---

*文档版本: v2.1 | 生成日期: 2026-05-12*
