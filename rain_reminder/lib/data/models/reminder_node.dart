class ReminderNode {
  final String id;
  final String name;
  final int hour;
  final int minute;
  final bool enabled;
  final String? customMessage;

  const ReminderNode({
    required this.id,
    required this.name,
    required this.hour,
    required this.minute,
    this.enabled = true,
    this.customMessage,
  });

  ReminderNode copyWith({
    String? id,
    String? name,
    int? hour,
    int? minute,
    bool? enabled,
    String? customMessage,
  }) {
    return ReminderNode(
      id: id ?? this.id,
      name: name ?? this.name,
      hour: hour ?? this.hour,
      minute: minute ?? this.minute,
      enabled: enabled ?? this.enabled,
      customMessage: customMessage ?? this.customMessage,
    );
  }

  String get timeString => '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
}
