import 'package:geolocator/geolocator.dart';

class LocatorService {
  Future<Map<String, String>?> getCurrentLocation() async {
    try {
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
        'name': '${position.latitude.toStringAsFixed(2)}, ${position.longitude.toStringAsFixed(2)} (当前位置)',
        'code': '${position.latitude.toStringAsFixed(2)},${position.longitude.toStringAsFixed(2)}',
      };
    } catch (_) {
      return null;
    }
  }
}
