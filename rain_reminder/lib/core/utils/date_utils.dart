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
