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
  DateTime? _lastFetched;

  WeatherNotifier(this._storage, this._settings) : super(null) {
    _loadCache();
    startAutoRefresh();
  }

  void _loadCache() {
    final cached = _storage.getWeatherCache();
    if (cached != null) {
      final temp = (cached['temp'] as num?)?.toDouble();
      if (temp != null) {
        state = WeatherData(
          cityName: cached['city'] ?? '',
          temperature: temp,
          condition: cached['condition'] ?? '',
          iconCode: cached['icon'] ?? '',
          humidity: cached['humidity'] ?? 0,
          windDirection: cached['wind'] ?? '',
          windScale: cached['windScale'] ?? 0,
          conditionText: cached['condition'] ?? '',
        );
        _lastFetched = DateTime.tryParse(cached['_cachedAt'] ?? '');
      }
    }
  }

  Future<void> fetchWeather() async {
    final settings = _settings;
    if (settings.defaultCityCode.isEmpty) return;

    try {
      state = await _weatherService.getCurrentWeather(
        settings.apiKey, settings.defaultCityCode, settings.defaultCityName,
      );
    } catch (_) {}

    if (state != null) {
      final minutely = await _weatherService.getMinutelyRain(
        settings.apiKey, settings.defaultCityCode, settings.defaultCityName,
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
      _lastFetched = DateTime.now();

      // 缓存天气
      _storage.saveWeatherCache({
        'city': state!.cityName,
        'temp': state!.temperature,
        'condition': state!.condition,
        'icon': state!.iconCode,
        'humidity': state!.humidity,
        'wind': state!.windDirection,
        'windScale': state!.windScale,
      });
    }
  }

  DateTime? get lastFetched => _lastFetched;

  void startAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(minutes: 30), (_) => fetchWeather());
    fetchWeather();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
