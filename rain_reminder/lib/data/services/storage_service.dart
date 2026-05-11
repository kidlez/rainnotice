import 'dart:convert';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/city.dart';
import '../models/reminder_node.dart';
import '../models/app_settings.dart';

class StorageService {
  static const String _citiesBox = 'cities';
  static const String _remindersBox = 'reminders';
  static const String _settingsBox = 'settings';

  late Box _citiesBoxInstance;
  late Box _remindersBoxInstance;
  late Box _settingsBoxInstance;

  Future<void> init() async {
    await Hive.initFlutter();
    _citiesBoxInstance = await Hive.openBox(_citiesBox);
    _remindersBoxInstance = await Hive.openBox(_remindersBox);
    _settingsBoxInstance = await Hive.openBox(_settingsBox);
  }

  // ──── 城市 ────

  List<City> getCities() {
    return _citiesBoxInstance.values.map((v) {
      final map = jsonDecode(v.toString()) as Map<String, dynamic>;
      return City(id: map['id'], name: map['name'], code: map['code']);
    }).toList();
  }

  Future<void> saveCity(City city) async {
    await _citiesBoxInstance.put(city.id, jsonEncode({
      'id': city.id, 'name': city.name, 'code': city.code,
    }));
  }

  Future<void> deleteCity(String id) async {
    await _citiesBoxInstance.delete(id);
  }

  // ──── 提醒 ────

  List<ReminderNode> getReminders() {
    final result = _remindersBoxInstance.values.map((v) {
      final map = jsonDecode(v.toString()) as Map<String, dynamic>;
      return ReminderNode(
        id: map['id'],
        name: map['name'],
        hour: map['hour'],
        minute: map['minute'],
        enabled: map['enabled'] ?? true,
        customMessage: map['customMessage'],
        repeatDays: map['repeatDays'] ?? ReminderNode.everyDay,
      );
    }).toList();
    result.sort((a, b) {
      if (a.hour != b.hour) return a.hour.compareTo(b.hour);
      return a.minute.compareTo(b.minute);
    });
    return result;
  }

  Future<void> saveReminder(ReminderNode node) async {
    await _remindersBoxInstance.put(node.id, jsonEncode({
      'id': node.id, 'name': node.name, 'hour': node.hour, 'minute': node.minute,
      'enabled': node.enabled, 'customMessage': node.customMessage, 'repeatDays': node.repeatDays,
    }));
  }

  Future<void> deleteReminder(String id) async {
    await _remindersBoxInstance.delete(id);
  }

  Future<void> toggleReminder(String id) async {
    final raw = _remindersBoxInstance.get(id);
    if (raw != null) {
      final map = jsonDecode(raw.toString()) as Map<String, dynamic>;
      map['enabled'] = !(map['enabled'] ?? true);
      await _remindersBoxInstance.put(id, jsonEncode(map));
    }
  }

  // ──── 设置 ────

  AppSettings getSettings() {
    final raw = _settingsBoxInstance.get('app_settings');
    if (raw != null) {
      final map = jsonDecode(raw.toString()) as Map<String, dynamic>;
      return AppSettings(
        apiKey: map['apiKey'] ?? '',
        defaultCityCode: map['defaultCityCode'] ?? '',
        defaultCityName: map['defaultCityName'] ?? '',
        messageStyleIndex: map['messageStyleIndex'] ?? 0,
        voiceEnabled: map['voiceEnabled'] ?? true,
        notificationEnabled: map['notificationEnabled'] ?? true,
        speechRate: (map['speechRate'] ?? 1.0).toDouble(),
        rainAlertMinutes: map['rainAlertMinutes'] ?? 30,
      );
    }
    return const AppSettings();
  }

  Future<void> saveSettings(AppSettings settings) async {
    await _settingsBoxInstance.put('app_settings', jsonEncode({
      'apiKey': settings.apiKey, 'defaultCityCode': settings.defaultCityCode,
      'defaultCityName': settings.defaultCityName, 'messageStyleIndex': settings.messageStyleIndex,
      'voiceEnabled': settings.voiceEnabled, 'notificationEnabled': settings.notificationEnabled,
      'speechRate': settings.speechRate, 'rainAlertMinutes': settings.rainAlertMinutes,
    }));
  }

  // ──── 天气缓存 ────

  Future<void> saveWeatherCache(Map<String, dynamic> data) async {
    data['_cachedAt'] = DateTime.now().toIso8601String();
    await _settingsBoxInstance.put('weather_cache', jsonEncode(data));
  }

  Map<String, dynamic>? getWeatherCache() {
    final raw = _settingsBoxInstance.get('weather_cache');
    if (raw == null) return null;
    try {
      return jsonDecode(raw.toString()) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // ──── 数据版本迁移 ────

  static const int _currentStorageVersion = 2;

  Future<void> migrateIfNeeded() async {
    final stored = _settingsBoxInstance.get('_storageVersion', defaultValue: 0) as int;
    if (stored >= _currentStorageVersion) return;

    if (stored < 1) await _migrateV0toV1();
    if (stored < 2) await _migrateV1toV2();

    await _settingsBoxInstance.put('_storageVersion', _currentStorageVersion);
  }

  Future<void> _migrateV0toV1() async {
    final raw = _settingsBoxInstance.get('app_settings');
    if (raw == null) return;
    try {
      final map = jsonDecode(raw.toString()) as Map<String, dynamic>;
      map.putIfAbsent('rainAlertMinutes', () => 30);
      map.putIfAbsent('speechRate', () => 1.0);
      await _settingsBoxInstance.put('app_settings', jsonEncode(map));
    } catch (_) {}
  }

  Future<void> _migrateV1toV2() async {
    // 为所有旧提醒补 repeatDays 字段（默认每天）
    for (final key in _remindersBoxInstance.keys) {
      try {
        final raw = _remindersBoxInstance.get(key);
        if (raw == null) continue;
        final map = jsonDecode(raw.toString()) as Map<String, dynamic>;
        if (!map.containsKey('repeatDays')) {
          map['repeatDays'] = ReminderNode.everyDay;
          await _remindersBoxInstance.put(key, jsonEncode(map));
        }
      } catch (_) {}
    }
  }
}
