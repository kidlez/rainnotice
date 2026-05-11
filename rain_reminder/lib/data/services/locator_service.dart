import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';

class LocatorService {
  final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 5),
  ));

  Future<Map<String, String>?> getCurrentLocation() async {
    // 1. 尝试 GPS (手机/浏览器原生)
    try {
      final result = await _tryGps();
      if (result != null) return await _resolveCityName(result);
    } catch (_) {}

    // 2. 尝试 IP 定位 (Windows 桌面降级)
    try {
      final result = await _tryIpLocation();
      if (result != null) return result;
    } catch (_) {}

    return null;
  }

  Future<Map<String, String>?> _tryGps() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return null;
    }
    if (permission == LocationPermission.deniedForever) return null;

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.low,
      timeLimit: const Duration(seconds: 10),
    );

    return {
      'code': '${position.latitude.toStringAsFixed(2)},${position.longitude.toStringAsFixed(2)}',
      'name': '${position.latitude.toStringAsFixed(2)},${position.longitude.toStringAsFixed(2)}',
    };
  }

  Future<Map<String, String>?> _tryIpLocation() async {
    try {
      final response = await _dio.get('http://ip-api.com/json');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final lat = data['lat'];
        final lon = data['lon'];
        final city = data['city'] as String? ?? '';
        final region = data['regionName'] as String? ?? '';
        final country = data['country'] as String? ?? '';

        if (lat != null && lon != null) {
          final name = city.isNotEmpty ? '$city, $region, $country' : '$lat, $lon';
          return {
            'code': '$lat,$lon',
            'name': name,
          };
        }
      }
    } catch (_) {}

    // 二次降级: 用另一个免费IP API
    try {
      final response = await _dio.get('https://ipapi.co/json/');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final lat = data['latitude'];
        final lon = data['longitude'];
        final city = data['city'] as String? ?? '';
        final region = data['region'] as String? ?? '';

        if (lat != null && lon != null) {
          final name = city.isNotEmpty ? '$city, $region' : '$lat, $lon';
          return {
            'code': '$lat,$lon',
            'name': name,
          };
        }
      }
    } catch (_) {}

    return null;
  }

  /// 反向地理编码：经纬度 → 城市名
  Future<Map<String, String>?> _resolveCityName(Map<String, String> coords) async {
    final parts = coords['code']!.split(',');
    if (parts.length != 2) return coords;
    final lat = parts[0].trim();
    final lon = parts[1].trim();

    try {
      final response = await _dio.get(
        'https://geocoding-api.open-meteo.com/v1/search',
        queryParameters: {'latitude': lat, 'longitude': lon, 'count': 1, 'language': 'zh'},
      );
      if (response.statusCode == 200 && response.data != null) {
        final results = response.data['results'] as List<dynamic>?;
        if (results != null && results.isNotEmpty) {
          final r = results.first as Map<String, dynamic>;
          final cityName = '${r['name'] ?? ''}, ${r['admin1'] ?? ''} (${r['country'] ?? ''})';
          return {'code': coords['code'] ?? '', 'name': cityName};
        }
      }
    } catch (_) {}

    return coords;
  }
}
