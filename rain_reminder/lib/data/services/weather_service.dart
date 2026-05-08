import 'package:dio/dio.dart';
import '../models/weather.dart';

class WeatherService {
  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  Future<WeatherData> getCurrentWeather(String apiKey, String cityCode, String cityName) async {
    final result = await _tryQWeather(apiKey, cityCode, cityName);
    if (result != null) return result;

    final result2 = await _tryOpenMeteoFull(cityCode, cityName);
    if (result2 != null) return result2;

    return WeatherData.empty(cityName);
  }

  Future<MinutelyRain> getMinutelyRain(String apiKey, String cityCode, String cityName) async {
    final result = await _tryQWeatherRain(apiKey, cityCode);
    if (result != null) return result;
    return const MinutelyRain(summary: '暂无降水', items: []);
  }

  Future<WeatherData?> _tryQWeather(String apiKey, String cityCode, String cityName) async {
    if (apiKey.isEmpty) return null;
    try {
      final response = await _dio.get(
        'https://devapi.qweather.com/v7/weather/now',
        queryParameters: {'location': cityCode, 'key': apiKey},
      );
      if (response.statusCode == 200 && response.data['code'] == '200') {
        return WeatherData.fromJson(response.data, cityName);
      }
    } catch (_) {}
    return null;
  }

  Future<MinutelyRain?> _tryQWeatherRain(String apiKey, String cityCode) async {
    if (apiKey.isEmpty) return null;
    try {
      final response = await _dio.get(
        'https://devapi.qweather.com/v7/weather/minutely/5m',
        queryParameters: {'location': cityCode, 'key': apiKey},
      );
      if (response.statusCode == 200 && response.data['code'] == '200') {
        return MinutelyRain.fromJson(response.data);
      }
    } catch (_) {}
    return null;
  }

  Future<WeatherData?> _tryOpenMeteoFull(String cityCode, String cityName) async {
    final parts = cityCode.split(',');
    if (parts.length != 2) return null;
    final lat = double.tryParse(parts[0].trim());
    final lon = double.tryParse(parts[1].trim());
    if (lat == null || lon == null) return null;

    try {
      final results = await Future.wait([
        _fetchOpenMeteoWeather(lat, lon),
        _fetchOpenMeteoAirQuality(lat, lon),
        _fetchOpenMeteoYesterday(lat, lon),
        _fetchOpenMeteoHourlyRain(lat, lon),
      ]);

      final weather = results[0] as Map<String, dynamic>?;
      final airQuality = results[1] as Map<String, dynamic>?;
      final yesterday = results[2] as Map<String, dynamic>?;
      final hourlyRain = results[3] as bool;

      if (weather == null) return null;

      return WeatherData.fromOpenMeteo(
        cityName: cityName,
        temperature: (weather['temperature'] as num).toDouble(),
        weatherCode: (weather['weatherCode'] as num).toInt(),
        humidity: (weather['humidity'] as num).toInt(),
        windDirection: (weather['windDirection'] as num).toInt(),
        windSpeed: (weather['windSpeed'] as num).toInt(),
        pm25: airQuality != null ? (airQuality['pm25'] as num?)?.toDouble() : null,
        yesterdayMaxTemp: yesterday != null ? (yesterday['tempMax'] as num?)?.toDouble() : null,
        rainIn2Hours: hourlyRain,
      );
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> _fetchOpenMeteoWeather(double lat, double lon) async {
    try {
      final response = await _dio.get('https://api.open-meteo.com/v1/forecast', queryParameters: {
        'latitude': lat,
        'longitude': lon,
        'current': 'temperature_2m,relative_humidity_2m,weather_code,wind_direction_10m,wind_speed_10m',
        'timezone': 'Asia/Shanghai',
        'forecast_days': 1,
      });
      if (response.statusCode == 200) {
        final current = response.data['current'] ?? {};
        return {
          'temperature': current['temperature_2m'] ?? 0,
          'humidity': current['relative_humidity_2m'] ?? 0,
          'weatherCode': current['weather_code'] ?? 0,
          'windDirection': current['wind_direction_10m'] ?? 0,
          'windSpeed': current['wind_speed_10m'] ?? 0,
        };
      }
    } catch (_) {}
    return null;
  }

  Future<Map<String, dynamic>?> _fetchOpenMeteoAirQuality(double lat, double lon) async {
    try {
      final response = await _dio.get('https://air-quality-api.open-meteo.com/v1/air-quality', queryParameters: {
        'latitude': lat,
        'longitude': lon,
        'current': 'pm2_5',
        'timezone': 'Asia/Shanghai',
      });
      if (response.statusCode == 200) {
        final current = response.data['current'] ?? {};
        return {'pm25': current['pm2_5'] ?? 0};
      }
    } catch (_) {}
    return null;
  }

  Future<Map<String, dynamic>?> _fetchOpenMeteoYesterday(double lat, double lon) async {
    try {
      final yesterday = DateTime.now().subtract(const Duration(days: 1));
      final dateStr = '${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}';
      final response = await _dio.get('https://api.open-meteo.com/v1/forecast', queryParameters: {
        'latitude': lat,
        'longitude': lon,
        'daily': 'temperature_2m_max',
        'past_days': 1,
        'timezone': 'Asia/Shanghai',
        'start_date': dateStr,
        'end_date': dateStr,
      });
      if (response.statusCode == 200) {
        final daily = response.data['daily'] ?? {};
        final temps = daily['temperature_2m_max'] as List<dynamic>?;
        if (temps != null && temps.isNotEmpty) {
          return {'tempMax': temps.first};
        }
      }
    } catch (_) {}
    return null;
  }

  Future<bool> _fetchOpenMeteoHourlyRain(double lat, double lon) async {
    try {
      final response = await _dio.get('https://api.open-meteo.com/v1/forecast', queryParameters: {
        'latitude': lat,
        'longitude': lon,
        'hourly': 'precipitation_probability',
        'forecast_hours': 2,
        'timezone': 'Asia/Shanghai',
      });
      if (response.statusCode == 200) {
        final hourly = response.data['hourly'] ?? {};
        final probs = hourly['precipitation_probability'] as List<dynamic>?;
        if (probs != null && probs.any((p) => (p as num).toDouble() > 30)) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  Future<List<Map<String, String>>> searchCity(String apiKey, String keyword) async {
    if (apiKey.isNotEmpty) {
      try {
        final response = await _dio.get(
          'https://geoapi.qweather.com/v2/city/lookup',
          queryParameters: {'location': keyword, 'key': apiKey},
        );
        if (response.statusCode == 200 && response.data['code'] == '200') {
          final List<dynamic> locations = response.data['location'] ?? [];
          return locations.map<Map<String, String>>((e) => {
            'name': '${e['name'] ?? ''}, ${e['adm1'] ?? ''}',
            'code': e['id'] ?? '',
          }).toList();
        }
      } catch (_) {}
    }

    try {
      final response = await _dio.get(
        'https://geocoding-api.open-meteo.com/v1/search',
        queryParameters: {'name': keyword, 'count': 5, 'language': 'zh'},
      );
      if (response.statusCode == 200) {
        final List<dynamic> results = response.data['results'] ?? [];
        return results.take(5).map<Map<String, String>>((e) => {
          'name': '${e['name'] ?? ''}, ${e['country'] ?? ''} (${e['admin1'] ?? ''})',
          'code': '${e['latitude']},${e['longitude']}',
        }).toList();
      }
    } catch (_) {}

    return [];
  }
}
