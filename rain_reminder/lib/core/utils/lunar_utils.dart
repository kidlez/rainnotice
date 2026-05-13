import 'package:lunar/lunar.dart';

class LunarInfo {
  final String lunarDate;
  final String solarTerm;
  final String holiday;
  final String festival;
  final String yearZodiac;

  const LunarInfo({
    required this.lunarDate,
    required this.solarTerm,
    required this.holiday,
    required this.festival,
    required this.yearZodiac,
  });
}

LunarInfo getTodaysLunarInfo() {
  final today = DateTime.now();
  final solar = Solar.fromDate(today);
  final lunar = solar.getLunar();

  // 农历日期
  final lunarDate = '${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}';

  // 节气
  final solarTerm = lunar.getJieQi() ?? '';

  // 法定节假日
  final holiday = _getHoliday(today);

  // 传统节日
  final festival = _getFestival(lunar);

  // 生肖
  final yearZodiac = '${lunar.getYearShengXiao()}年';

  return LunarInfo(
    lunarDate: lunarDate,
    solarTerm: solarTerm.isNotEmpty ? solarTerm : '',
    holiday: holiday,
    festival: festival,
    yearZodiac: yearZodiac,
  );
}

String _getHoliday(DateTime date) {
  final m = date.month;
  final d = date.day;

  // 固定公历假期
  if (m == 1 && d == 1) return '元旦';
  if (m == 5 && d == 1) return '劳动节';
  if (m == 10 && d == 1) return '国庆节';
  if (m == 4 && d == 5) return '清明节(假)';
  if (m == 6 && d == 1) return '儿童节';
  if (m == 3 && d == 8) return '妇女节';

  return '';
}

String _getFestival(Lunar lunar) {
  final m = lunar.getMonth();
  final d = lunar.getDay();

  if (m == 1 && d == 1) return '春节';
  if (m == 1 && d == 15) return '元宵节';
  if (m == 5 && d == 5) return '端午节';
  if (m == 7 && d == 7) return '七夕';
  if (m == 7 && d == 15) return '中元节';
  if (m == 8 && d == 15) return '中秋节';
  if (m == 9 && d == 9) return '重阳节';
  if (m == 12 && d == 30) return '除夕';
  if (m == 12 && d == 29) return '除夕';

  return '';
}

String getLunarDisplayText() {
  final info = getTodaysLunarInfo();
  final parts = <String>[];

  parts.add(info.lunarDate);

  if (info.solarTerm.isNotEmpty) parts.add(info.solarTerm);
  if (info.festival.isNotEmpty) parts.add(info.festival);
  if (info.holiday.isNotEmpty) parts.add(info.holiday);

  return '${info.yearZodiac} · ${parts.join(' · ')}';
}
