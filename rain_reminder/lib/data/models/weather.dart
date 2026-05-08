class WeatherData {
  final String cityName;
  final double temperature;
  final String condition;
  final String iconCode;
  final int humidity;
  final String windDirection;
  final int windScale;
  final bool isRaining;
  final int? minutesUntilRain;
  final String conditionText;

  // 扩展天气关怀字段
  final double? pm25;
  final double? yesterdayTemp;
  final bool rainIn2Hours;
  final bool tempDrop;

  const WeatherData({
    required this.cityName,
    required this.temperature,
    required this.condition,
    required this.iconCode,
    required this.humidity,
    required this.windDirection,
    required this.windScale,
    this.isRaining = false,
    this.minutesUntilRain,
    this.conditionText = '',
    this.pm25,
    this.yesterdayTemp,
    this.rainIn2Hours = false,
    this.tempDrop = false,
  });

  factory WeatherData.fromJson(Map<String, dynamic> json, String cityName) {
    final now = json['now'] ?? {};
    return WeatherData(
      cityName: cityName,
      temperature: (now['temp'] ?? 0).toDouble(),
      condition: now['text'] ?? '',
      iconCode: now['icon'] ?? '100',
      humidity: (now['humidity'] ?? 0).toInt(),
      windDirection: now['windDir'] ?? '',
      windScale: (now['windScale'] ?? 0).toInt(),
      isRaining: _isRainCondition(now['icon'] ?? '100'),
      conditionText: now['text'] ?? '',
    );
  }

  factory WeatherData.fromOpenMeteo({
    required String cityName,
    required double temperature,
    required int weatherCode,
    required int humidity,
    required int windDirection,
    required int windSpeed,
    double? pm25,
    double? yesterdayMaxTemp,
    bool rainIn2Hours = false,
  }) {
    final isRain = weatherCode >= 50 && weatherCode <= 99;
    final tempDrop = yesterdayMaxTemp != null && temperature < yesterdayMaxTemp - 3;
    return WeatherData(
      cityName: cityName,
      temperature: temperature,
      condition: _omWeatherText(weatherCode),
      iconCode: weatherCode.toString(),
      humidity: humidity,
      windDirection: _omWindDir(windDirection),
      windScale: windSpeed,
      isRaining: isRain,
      conditionText: _omWeatherText(weatherCode),
      pm25: pm25,
      yesterdayTemp: yesterdayMaxTemp,
      rainIn2Hours: rainIn2Hours,
      tempDrop: tempDrop,
    );
  }

  factory WeatherData.empty(String cityName) {
    return WeatherData(
      cityName: cityName,
      temperature: 0,
      condition: '未知',
      iconCode: '999',
      humidity: 0,
      windDirection: '未知',
      windScale: 0,
    );
  }

  /// 生成天气关怀提示列表
  List<String> getWeatherTips() {
    final tips = <String>[];
    if (isRaining) {
      tips.add('外面正在下雨，记得带伞');
    } else if (rainIn2Hours) {
      tips.add('两小时内可能下雨，出门记得带伞');
    }
    if (pm25 != null && pm25! > 75) {
      tips.add('空气质量较差，记得戴口罩');
    }
    if (tempDrop) {
      final drop = yesterdayTemp != null ? (yesterdayTemp! - temperature).round() : 0;
      if (drop > 0) {
        tips.add('今天降温了，比昨天低${drop}度，注意保暖');
      } else {
        tips.add('今天降温了，注意保暖');
      }
    }
    return tips;
  }

  static bool _isRainCondition(String icon) {
    return [
      '300', '301', '302', '303', '304', '305', '306', '307', '308', '309',
      '310', '311', '312', '313', '314', '315', '316', '317', '318',
      '350', '351',
      '400', '401', '402', '403', '404', '405', '406', '407', '408', '409',
      '410',
      '456', '457',
    ].contains(icon);
  }

  static String _omWeatherText(int code) {
    if (code <= 1) return '晴';
    if (code == 2) return '多云';
    if (code == 3) return '阴';
    if (code <= 49) return '雾霾';
    if (code <= 59) return '小雨';
    if (code <= 69) return '中雨';
    if (code <= 79) return '大雪';
    if (code <= 84) return '阵雨';
    if (code <= 94) return '雷雨';
    if (code <= 99) return '暴雨';
    return '未知';
  }

  static String _omWindDir(int degrees) {
    final dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    return dirs[((degrees + 22.5) / 45).round() % 8];
  }
}

class MinutelyRain {
  final String summary;
  final List<MinutelyItem> items;

  const MinutelyRain({required this.summary, required this.items});

  factory MinutelyRain.fromJson(Map<String, dynamic> json) {
    final minutely = json['minutely'] ?? {};
    final list = (minutely['precip'] as List<dynamic>?) ?? [];
    final items = list.map((e) => MinutelyItem(
      fxTime: e['fxTime'] ?? '',
      precip: (e['precip'] ?? 0).toDouble(),
    )).toList();

    final hasRainSoon = items.any((item) => item.precip > 0);
    final summary = hasRainSoon
        ? '${items.firstWhere((e) => e.precip > 0).fxTime} 将下雨'
        : '暂无降水';

    return MinutelyRain(
      summary: summary,
      items: items,
    );
  }

  int? get minutesUntilRain {
    for (final item in items) {
      if (item.precip > 0) {
        final now = DateTime.now();
        final rainTime = DateTime.tryParse(item.fxTime.replaceAll('+08:00', ''));
        if (rainTime != null) {
          return rainTime.difference(now).inMinutes;
        }
      }
    }
    return null;
  }
}

class MinutelyItem {
  final String fxTime;
  final double precip;

  const MinutelyItem({required this.fxTime, required this.precip});
}
