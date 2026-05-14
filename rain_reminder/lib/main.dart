import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:system_tray/system_tray.dart';
import 'package:window_manager/window_manager.dart';
import 'data/services/storage_service.dart';
import 'data/services/notification_service.dart';
import 'data/services/tts_service.dart';
import 'data/services/message_loader.dart';
import 'data/services/locator_service.dart';
import 'presentation/providers/settings_provider.dart';
import 'presentation/providers/reminder_provider.dart';
import 'app.dart';

final storageService = StorageService();
final notificationService = NotificationService();
final ttsService = TtsService();
final messageLoader = MessageLoader();
final locatorService = LocatorService();

final SystemTray _systemTray = SystemTray();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // 窗口管理：关闭 → 最小化到托盘
  await windowManager.ensureInitialized();
  await windowManager.setPreventClose(true);
  windowManager.addListener(_WindowListener());
  WindowOptions windowOptions = const WindowOptions(
    size: Size(420, 780),
    minimumSize: Size(380, 600),
    center: true,
    title: '雨声提醒',
  );
  windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.show();
    await windowManager.focus();
  });

  // 系统托盘
  await _initSystemTray();

  // 初始化服务
  await storageService.init();
  await storageService.migrateIfNeeded();
  await notificationService.init();
  await ttsService.init();
  await messageLoader.load('zh-cn');

  // 自动定位
  final settings = storageService.getSettings();
  if (settings.defaultCityCode.isEmpty) {
    final location = await locatorService.getCurrentLocation();
    if (location != null) {
      storageService.saveSettings(settings.copyWith(
        defaultCityCode: location['code']!,
        defaultCityName: location['name']!,
      ));
    }
  }

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storageService),
        messageLoaderProvider.overrideWithValue(messageLoader),
      ],
      child: const RainReminderApp(),
    ),
  );
}

Future<void> _initSystemTray() async {
  try {
    await _systemTray.initSystemTray(
      title: '雨声提醒',
      iconPath: 'assets/icon/icon.png',
    );

    final menu = Menu();
    await menu.buildFrom([
      MenuItemLabel(label: '显示', onClicked: (menuItem) {
        windowManager.show();
        windowManager.focus();
      }),
      MenuItemLabel(label: '退出', onClicked: (menuItem) {
        _systemTray.destroy();
        windowManager.destroy();
      }),
    ]);
    await _systemTray.setContextMenu(menu);

    // 托盘图标点击 → 显示窗口
    _systemTray.registerSystemTrayEventHandler((eventName) {
      if (eventName == 'leftMouseUp' || eventName == 'leftMouseClick') {
        windowManager.show();
        windowManager.focus();
      }
    });
  } catch (_) {}
}

class _WindowListener extends WindowListener {
  @override
  void onWindowClose() {
    windowManager.hide();
  }
}
