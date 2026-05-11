class ReminderNode {
  final String id;
  final String name;
  final int hour;
  final int minute;
  final bool enabled;
  final String? customMessage;
  final int repeatDays;

  static const int everyDay = 127;

  const ReminderNode({
    required this.id,
    required this.name,
    required this.hour,
    required this.minute,
    this.enabled = true,
    this.customMessage,
    this.repeatDays = everyDay,
  });

  ReminderNode copyWith({
    String? id,
    String? name,
    int? hour,
    int? minute,
    bool? enabled,
    String? customMessage,
    int? repeatDays,
  }) {
    return ReminderNode(
      id: id ?? this.id,
      name: name ?? this.name,
      hour: hour ?? this.hour,
      minute: minute ?? this.minute,
      enabled: enabled ?? this.enabled,
      customMessage: customMessage ?? this.customMessage,
      repeatDays: repeatDays ?? this.repeatDays,
    );
  }

  bool isDueOn(DateTime date) {
    final idx = date.weekday % 7; // Sunday=0 ... Saturday=6
    return (repeatDays >> idx) & 1 == 1;
  }

  String get repeatLabel {
    if (repeatDays == 127) return '每天';
    if (repeatDays == 62) return '工作日';
    if (repeatDays == 65) return '周末';
    return '自定义';
  }

  String get timeString => '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
}
