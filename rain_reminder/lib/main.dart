import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // 初始化服务
  await storageService.init();
  await storageService.migrateIfNeeded();
  await notificationService.init();
  await ttsService.init();
  await messageLoader.load('zh-cn');

  // 自动定位：首次启动无城市时自动获取
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
