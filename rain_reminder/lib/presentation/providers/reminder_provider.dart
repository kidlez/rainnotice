import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/reminder_node.dart';
import '../../data/models/app_settings.dart';
import '../../data/services/storage_service.dart';
import '../../data/services/notification_service.dart';
import '../../data/services/tts_service.dart';
import '../../core/constants/app_strings.dart';
import 'settings_provider.dart';
import 'weather_provider.dart';

final reminderProvider = StateNotifierProvider<ReminderNotifier, List<ReminderNode>>((ref) {
  final storage = ref.watch(storageServiceProvider);
  final weather = ref.watch(weatherProvider.notifier);
  final settings = ref.watch(settingsProvider);
  return ReminderNotifier(storage, weather, settings);
});

class ReminderNotifier extends StateNotifier<List<ReminderNode>> {
  final StorageService _storage;
  final WeatherNotifier _weatherNotifier;
  final AppSettings _settings;

  ReminderNotifier(this._storage, this._weatherNotifier, this._settings)
      : super(_storage.getReminders());

  void addReminder(ReminderNode node) {
    _storage.saveReminder(node);
    state = [...state, node];
    _sort();
  }

  void updateReminder(ReminderNode node) {
    _storage.saveReminder(node);
    state = state.map((r) => r.id == node.id ? node : r).toList();
    _sort();
  }

  void deleteReminder(String id) {
    _storage.deleteReminder(id);
    state = state.where((r) => r.id != id).toList();
  }

  void toggleReminder(String id) {
    _storage.toggleReminder(id);
    state = state.map((r) => r.id == id ? r.copyWith(enabled: !r.enabled) : r).toList();
  }

  void initializePresets() {
    if (state.isNotEmpty) return;
    final presets = AppStrings.presetReminders.entries.map((e) {
      return ReminderNode(
        id: 'preset_${e.key}',
        name: e.key,
        hour: int.parse(e.value['hour']!),
        minute: int.parse(e.value['minute']!),
        enabled: true,
      );
    }).toList();
    for (final preset in presets) {
      _storage.saveReminder(preset);
    }
    state = presets;
    _scheduleAll();
  }

  String getMessage(ReminderNode node) {
    if (node.customMessage != null && node.customMessage!.isNotEmpty) {
      return node.customMessage!;
    }
    final settings = _settings;
    final isToxic = settings.messageStyle == MessageStyle.toxic;
    final messages = isToxic
        ? (AppStrings.toxicMessages[node.name] ?? AppStrings.toxicMessages['default']!)
        : (AppStrings.warmMessages[node.name] ?? AppStrings.warmMessages['default']!);
    return messages[Random().nextInt(messages.length)];
  }

  Future<void> triggerReminder(ReminderNode node) async {
    final notificationService = NotificationService();
    final ttsService = TtsService();
    final settings = _settings;

    String message = getMessage(node);

    if (_weatherNotifier.state != null) {
      final weather = _weatherNotifier.state!;
      final tips = weather.getWeatherTips();
      if (tips.isNotEmpty) {
        message = '$message。${tips.join('，')}';
      }
    }

    if (settings.notificationEnabled) {
      await notificationService.showReminderNotification(
        id: node.id.hashCode,
        title: '${node.name}时间',
        body: message,
      );
    }

    if (settings.voiceEnabled) {
      await ttsService.speak(message, rate: settings.speechRate);
    }
  }

  void _sort() {
    state = [...state]
      ..sort((a, b) {
        if (a.hour != b.hour) return a.hour.compareTo(b.hour);
        return a.minute.compareTo(b.minute);
      });
  }

  void _scheduleAll() async {
    final notificationService = NotificationService();
    await notificationService.cancelAll();
    final now = DateTime.now();

    for (int i = 0; i < state.length; i++) {
      final node = state[i];
      if (!node.enabled) continue;

      DateTime scheduledTime = DateTime(now.year, now.month, now.day, node.hour, node.minute);
      if (scheduledTime.isBefore(now)) {
        scheduledTime = scheduledTime.add(const Duration(days: 1));
      }

      await notificationService.scheduleReminder(
        id: i,
        title: '${node.name}时间',
        body: getMessage(node),
        scheduledDate: scheduledTime,
      );
    }
  }

  void rescheduleAll() {
    _scheduleAll();
  }
}
