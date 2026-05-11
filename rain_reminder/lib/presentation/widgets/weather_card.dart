import 'package:flutter/material.dart';
import '../../data/models/weather.dart';

class WeatherCard extends StatelessWidget {
  final WeatherData? weather;
  final DateTime? lastUpdated;
  final String greeting;
  final VoidCallback? onRefresh;

  const WeatherCard({super.key, required this.weather, this.lastUpdated, this.greeting = '', this.onRefresh});

  @override
  Widget build(BuildContext context) {
    if (weather == null) return _buildEmptyCard();

    final tips = weather!.getWeatherTips();
    final staleText = _staleText();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Card(
        color: Colors.white.withValues(alpha: 0.12),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.location_on, color: Colors.white70, size: 14),
                            const SizedBox(width: 3),
                            Text(weather!.cityName, style: const TextStyle(fontSize: 13, color: Colors.white70)),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text('${weather!.temperature.toInt()}°',
                          style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w300, color: Colors.white, height: 1.1)),
                        Text(weather!.condition, style: const TextStyle(fontSize: 12, color: Colors.white70)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _infoRow(Icons.water_drop, '${weather!.humidity}%'),
                      const SizedBox(height: 4),
                      _infoRow(Icons.air, '${weather!.windDirection}${weather!.windScale}级'),
                    ],
                  ),
                ],
              ),
              if (tips.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6, runSpacing: 4,
                  children: tips.map((t) => _buildTipChip(t)).toList(),
                ),
              ],
              if (staleText != null) ...[
                const SizedBox(height: 6),
                Text(staleText, style: const TextStyle(fontSize: 10, color: Colors.white38)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Card(
        color: Colors.white.withValues(alpha: 0.12),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: const Padding(
          padding: EdgeInsets.all(20),
          child: Center(child: Text('获取天气中…', style: TextStyle(color: Colors.white54, fontSize: 14))),
        ),
      ),
    );
  }

  Widget _buildTipChip(String tip) {
    Color bg;
    if (tip.contains('带伞') || tip.contains('下雨')) {
      bg = const Color(0xFF4A90E2);
    } else if (tip.contains('口罩') || tip.contains('空气')) {
      bg = const Color(0xFFE25C5C);
    } else if (tip.contains('降温') || tip.contains('保暖')) {
      bg = const Color(0xFF5C9CE2);
    } else {
      bg = const Color(0xFF7B8BA3);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(10)),
      child: Text(tip, style: const TextStyle(color: Colors.white, fontSize: 11)),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white.withValues(alpha: 0.5), size: 13),
        const SizedBox(width: 3),
        Text(text, style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12)),
      ],
    );
  }

  String? _staleText() {
    if (lastUpdated == null) return null;
    final diff = DateTime.now().difference(lastUpdated!);
    if (diff.inMinutes < 1) return null;
    if (diff.inHours < 1) return '${diff.inMinutes}分钟前更新';
    return '${diff.inHours}小时前更新';
  }
}
