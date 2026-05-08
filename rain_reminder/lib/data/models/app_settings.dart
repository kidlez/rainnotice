enum MessageStyle { toxic, warm }

class AppSettings {
  final String apiKey;
  final String defaultCityCode;
  final String defaultCityName;
  final int messageStyleIndex;
  final bool voiceEnabled;
  final bool notificationEnabled;
  final double speechRate;
  final int rainAlertMinutes;

  const AppSettings({
    this.apiKey = '',
    this.defaultCityCode = '39.90,116.40',
    this.defaultCityName = '北京',
    this.messageStyleIndex = 0,
    this.voiceEnabled = true,
    this.notificationEnabled = true,
    this.speechRate = 1.0,
    this.rainAlertMinutes = 30,
  });

  MessageStyle get messageStyle => MessageStyle.values[messageStyleIndex];

  AppSettings copyWith({
    String? apiKey,
    String? defaultCityCode,
    String? defaultCityName,
    int? messageStyleIndex,
    bool? voiceEnabled,
    bool? notificationEnabled,
    double? speechRate,
    int? rainAlertMinutes,
  }) {
    return AppSettings(
      apiKey: apiKey ?? this.apiKey,
      defaultCityCode: defaultCityCode ?? this.defaultCityCode,
      defaultCityName: defaultCityName ?? this.defaultCityName,
      messageStyleIndex: messageStyleIndex ?? this.messageStyleIndex,
      voiceEnabled: voiceEnabled ?? this.voiceEnabled,
      notificationEnabled: notificationEnabled ?? this.notificationEnabled,
      speechRate: speechRate ?? this.speechRate,
      rainAlertMinutes: rainAlertMinutes ?? this.rainAlertMinutes,
    );
  }
}
