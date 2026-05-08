import 'package:flutter/material.dart';

class AppColors {
  static const primary = Color(0xFF4A90E2);
  static const background = Color(0xFFF5F7FA);
  static const card = Colors.white;
  static const textPrimary = Color(0xFF333333);
  static const textSecondary = Color(0xFF666666);
  static const accent = Color(0xFFFF6B6B);
  static const success = Color(0xFF52C41A);
  static const warning = Color(0xFFFAAD14);

  static const darkPrimary = Color(0xFF5AA0F2);
  static const darkBackground = Color(0xFF1A1A1A);
  static const darkCard = Color(0xFF2A2A2A);
  static const darkTextPrimary = Colors.white;
  static const darkTextSecondary = Color(0xFFAAAAAA);

  static Color weatherGradientTop(String condition, {bool isDark = false}) {
    if (condition.contains('晴') || condition.contains('sunny') || condition.contains('clear')) {
      return isDark ? const Color(0xFF2A3A4A) : const Color(0xFF87CEEB);
    }
    if (condition.contains('阴') || condition.contains('cloudy')) {
      return isDark ? const Color(0xFF3A3A3A) : const Color(0xFFB0B0B0);
    }
    if (condition.contains('雨') || condition.contains('rain')) {
      return isDark ? const Color(0xFF1A2A3A) : const Color(0xFF4682B4);
    }
    if (condition.contains('雪') || condition.contains('snow')) {
      return isDark ? const Color(0xFF3A4A5A) : const Color(0xFFE0FFFF);
    }
    return isDark ? const Color(0xFF2A3A4A) : const Color(0xFF87CEEB);
  }

  static Color weatherGradientBottom(String condition, {bool isDark = false}) {
    if (condition.contains('晴') || condition.contains('sunny') || condition.contains('clear')) {
      return isDark ? const Color(0xFF3A2A1A) : const Color(0xFFFFD700);
    }
    if (condition.contains('阴') || condition.contains('cloudy')) {
      return isDark ? const Color(0xFF4A4A4A) : const Color(0xFFD3D3D3);
    }
    if (condition.contains('雨') || condition.contains('rain')) {
      return isDark ? const Color(0xFF0A1A2A) : const Color(0xFF1E90FF);
    }
    if (condition.contains('雪') || condition.contains('snow')) {
      return isDark ? const Color(0xFF2A3A4A) : Colors.white;
    }
    return isDark ? const Color(0xFF3A2A1A) : const Color(0xFFFFD700);
  }
}
