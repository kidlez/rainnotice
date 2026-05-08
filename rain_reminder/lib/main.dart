import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'data/services/storage_service.dart';
import 'data/services/notification_service.dart';
import 'data/services/tts_service.dart';
import 'presentation/providers/reminder_provider.dart';
import 'presentation/providers/settings_provider.dart';
import 'app.dart';

final storageService = StorageService();
final notificationService = NotificationService();
final ttsService = TtsService();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  await storageService.init();
  await notificationService.init();
  await ttsService.init();

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storageService),
      ],
      child: const RainReminderApp(),
    ),
  );
}
