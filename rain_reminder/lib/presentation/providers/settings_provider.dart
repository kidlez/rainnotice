import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/app_settings.dart';
import '../../data/services/storage_service.dart';

final storageServiceProvider = Provider<StorageService>((ref) {
  throw UnimplementedError('Must be overridden');
});

final settingsProvider = StateNotifierProvider<SettingsNotifier, AppSettings>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return SettingsNotifier(storage);
});

class SettingsNotifier extends StateNotifier<AppSettings> {
  final StorageService _storage;

  SettingsNotifier(this._storage) : super(_storage.getSettings());

  void updateApiKey(String key) {
    state = state.copyWith(apiKey: key);
    _storage.saveSettings(state);
  }

  void updateCity(String code, String name) {
    state = state.copyWith(defaultCityCode: code, defaultCityName: name);
    _storage.saveSettings(state);
  }

  void toggleMessageStyle() {
    final nextIndex = (state.messageStyleIndex + 1) % MessageStyle.values.length;
    state = state.copyWith(messageStyleIndex: nextIndex);
    _storage.saveSettings(state);
  }

  void setMessageStyle(MessageStyle style) {
    state = state.copyWith(messageStyleIndex: style.index);
    _storage.saveSettings(state);
  }

  void toggleVoice() {
    state = state.copyWith(voiceEnabled: !state.voiceEnabled);
    _storage.saveSettings(state);
  }

  void toggleNotification() {
    state = state.copyWith(notificationEnabled: !state.notificationEnabled);
    _storage.saveSettings(state);
  }

  void setSpeechRate(double rate) {
    state = state.copyWith(speechRate: rate);
    _storage.saveSettings(state);
  }

  void setRainAlertMinutes(int minutes) {
    state = state.copyWith(rainAlertMinutes: minutes);
    _storage.saveSettings(state);
  }
}
