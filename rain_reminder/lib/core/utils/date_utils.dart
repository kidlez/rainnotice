String formatCountdown(int hours, int minutes) {
  final parts = <String>[];
  if (hours > 0) parts.add('${hours}小时');
  if (minutes > 0 || parts.isEmpty) parts.add('${minutes}分钟');
  return parts.join('');
}

int minutesUntil(int targetHour, int targetMinute) {
  final now = DateTime.now();
  var target = DateTime(now.year, now.month, now.day, targetHour, targetMinute);
  if (target.isBefore(now)) {
    target = target.add(const Duration(days: 1));
  }
  return target.difference(now).inMinutes;
}

DateTime nextReminderTime(int hour, int minute) {
  final now = DateTime.now();
  var target = DateTime(now.year, now.month, now.day, hour, minute);
  if (target.isBefore(now)) target = target.add(const Duration(days: 1));
  return target;
}

String getWeatherIcon(String code) {
  if (code == '100') return '\u2600';
  if (code == '101' || code == '102' || code == '103') return '\u26C5';
  if (code == '104') return '\u2601';
  if (code.startsWith('3')) return '\uD83C\uDF27';
  if (code.startsWith('4')) return '\uD83C\uDF27';
  if (code.startsWith('5') || code == '307' || code == '302') return '\uD83C\uDF27';
  if (code.startsWith('6')) return '\uD83C\uDF28';
  if (code.startsWith('7')) return '\uD83C\uDF2B';
  return '\u2600';
}

String getTimeGreeting() {
  final hour = DateTime.now().hour;
  if (hour >= 6 && hour < 9) return '早上好！新的一天开始了';
  if (hour >= 9 && hour < 12) return '上午好！今天也要加油';
  if (hour >= 12 && hour < 14) return '中午好，别忘了吃饭哦';
  if (hour >= 14 && hour < 18) return '下午好！来杯咖啡提提神';
  if (hour >= 18 && hour < 21) return '傍晚好！外面天气不错';
  if (hour >= 21 && hour < 23) return '晚上好，今天辛苦了';
  return '夜深了，早点休息';
}
