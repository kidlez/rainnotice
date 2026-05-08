import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/weather.dart';
import '../../data/models/app_settings.dart';
import '../../data/services/weather_service.dart';
import '../../data/services/storage_service.dart';
import 'settings_provider.dart';

final weatherProvider = StateNotifierProvider<WeatherNotifier, WeatherData?>((ref) {
  final storage = ref.watch(storageServiceProvider);
  final settings = ref.watch(settingsProvider);
  return WeatherNotifier(storage, settings);
});

class WeatherNotifier extends StateNotifier<WeatherData?> {
  final StorageService _storage;
  final AppSettings _settings;
  final WeatherService _weatherService = WeatherService();
  Timer? _refreshTimer;

  WeatherNotifier(this._storage, this._settings) : super(null) {
    startAutoRefresh();
  }

  Future<void> fetchWeather() async {
    final settings = _settings;
    if (settings.defaultCityCode.isEmpty) return;

    state = await _weatherService.getCurrentWeather(
      settings.apiKey,
      settings.defaultCityCode,
      settings.defaultCityName,
    );

    if (state != null) {
      final minutely = await _weatherService.getMinutelyRain(
        settings.apiKey,
        settings.defaultCityCode,
        settings.defaultCityName,
      );
      state = WeatherData(
        cityName: state!.cityName,
        temperature: state!.temperature,
        condition: state!.condition,
        iconCode: state!.iconCode,
        humidity: state!.humidity,
        windDirection: state!.windDirection,
        windScale: state!.windScale,
        isRaining: state!.isRaining || minutely.minutesUntilRain != null,
        minutesUntilRain: minutely.minutesUntilRain,
        conditionText: state!.conditionText,
        pm25: state!.pm25,
        yesterdayTemp: state!.yesterdayTemp,
        rainIn2Hours: state!.rainIn2Hours,
        tempDrop: state!.tempDrop,
      );
    }
  }

  void startAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(minutes: 30), (_) {
      fetchWeather();
    });
    fetchWeather();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
