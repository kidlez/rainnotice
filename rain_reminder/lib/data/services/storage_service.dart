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

  List<City> getCities() {
    return _citiesBoxInstance.values.map((v) {
      final map = jsonDecode(v.toString()) as Map<String, dynamic>;
      return City(id: map['id'], name: map['name'], code: map['code']);
    }).toList();
  }

  Future<void> saveCity(City city) async {
    await _citiesBoxInstance.put(city.id, jsonEncode({
      'id': city.id,
      'name': city.name,
      'code': city.code,
    }));
  }

  Future<void> deleteCity(String id) async {
    await _citiesBoxInstance.delete(id);
  }

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
      'id': node.id,
      'name': node.name,
      'hour': node.hour,
      'minute': node.minute,
      'enabled': node.enabled,
      'customMessage': node.customMessage,
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
      'apiKey': settings.apiKey,
      'defaultCityCode': settings.defaultCityCode,
      'defaultCityName': settings.defaultCityName,
      'messageStyleIndex': settings.messageStyleIndex,
      'voiceEnabled': settings.voiceEnabled,
      'notificationEnabled': settings.notificationEnabled,
      'speechRate': settings.speechRate,
      'rainAlertMinutes': settings.rainAlertMinutes,
    }));
  }
}
