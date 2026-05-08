import 'package:flutter/material.dart';
import '../../data/models/weather.dart';

class WeatherCard extends StatelessWidget {
  final WeatherData? weather;

  const WeatherCard({super.key, required this.weather});

  @override
  Widget build(BuildContext context) {
    if (weather == null) {
      return _buildEmptyCard();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Card(
        color: Colors.white.withOpacity(0.12),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: Colors.white70, size: 14),
                        const SizedBox(width: 3),
                        Text(weather!.cityName,
                          style: const TextStyle(fontSize: 13, color: Colors.white70)),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text('${weather!.temperature.toInt()}°',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w300, color: Colors.white, height: 1.1)),
                    Text(weather!.condition,
                      style: const TextStyle(fontSize: 12, color: Colors.white70)),
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
        ),
      ),
    );
  }

  Widget _buildEmptyCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Card(
        color: Colors.white.withOpacity(0.12),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: const Padding(
          padding: EdgeInsets.all(20),
          child: Center(child: Text('获取天气中...', style: TextStyle(color: Colors.white54, fontSize: 14))),
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white.withOpacity(0.5), size: 13),
        const SizedBox(width: 3),
        Text(text, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
      ],
    );
  }
}
