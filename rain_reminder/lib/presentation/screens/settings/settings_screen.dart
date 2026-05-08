import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/app_settings.dart';
import '../../../data/services/weather_service.dart';
import '../../../data/services/tts_service.dart';
import '../../../data/services/locator_service.dart';
import '../../../presentation/providers/settings_provider.dart';
import '../../../presentation/providers/theme_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final theme = ref.watch(themeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _sectionHeader(context, '城市管理'),
          Card(
            child: ListTile(
              leading: const Icon(Icons.location_city),
              title: const Text('当前城市'),
              subtitle: Text(settings.defaultCityName.isEmpty ? '未设置' : settings.defaultCityName),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _showCityDialog(context, ref),
            ),
          ),
          const SizedBox(height: 16),
          _sectionHeader(context, 'API 配置'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    decoration: const InputDecoration(
                      labelText: '和风天气 API Key（可选）',
                      hintText: '留空则使用免费 Open-Meteo',
                      border: OutlineInputBorder(),
                    ),
                    controller: TextEditingController(text: settings.apiKey),
                    onChanged: (v) => ref.read(settingsProvider.notifier).updateApiKey(v),
                  ),
                  const SizedBox(height: 8),
                  Text('留空自动用 Open-Meteo 免费天气 → 无需注册\n填入和风天气 Key 可获取更精准的降水预报',
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _sectionHeader(context, '消息风格'),
          Card(
            child: Column(
              children: [
                RadioListTile<MessageStyle>(
                  title: const Text('毒鸡汤风格'), subtitle: const Text('幽默扎心，提神醒脑'),
                  value: MessageStyle.toxic, groupValue: settings.messageStyle,
                  onChanged: (v) { if (v != null) ref.read(settingsProvider.notifier).setMessageStyle(v); },
                ),
                const Divider(height: 1),
                RadioListTile<MessageStyle>(
                  title: const Text('暖心风格'), subtitle: const Text('温柔关怀，暖心治愈'),
                  value: MessageStyle.warm, groupValue: settings.messageStyle,
                  onChanged: (v) { if (v != null) ref.read(settingsProvider.notifier).setMessageStyle(v); },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _sectionHeader(context, '通知设置'),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('通知开关'), subtitle: const Text('开启后通过系统通知提醒'),
                  value: settings.notificationEnabled,
                  onChanged: (_) => ref.read(settingsProvider.notifier).toggleNotification(),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  title: const Text('语音播报'), subtitle: const Text('开启后使用语音播报提醒内容'),
                  value: settings.voiceEnabled,
                  onChanged: (_) => ref.read(settingsProvider.notifier).toggleVoice(),
                ),
                if (settings.voiceEnabled) ...[
                  const Divider(height: 1),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        const Text('语速: '),
                        Expanded(
                          child: Slider(
                            value: settings.speechRate, min: 0.5, max: 2.0, divisions: 6,
                            label: '${settings.speechRate.toStringAsFixed(1)}x',
                            onChanged: (v) => ref.read(settingsProvider.notifier).setSpeechRate(v),
                          ),
                        ),
                        Text('${settings.speechRate.toStringAsFixed(1)}x',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.volume_up, size: 18),
                        label: const Text('测试语音'),
                        onPressed: () async {
                          final tts = TtsService();
                          await tts.speak('这是一条测试语音。今天也要好好照顾自己！', rate: settings.speechRate);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          _sectionHeader(context, '外观'),
          Card(
            child: Column(
              children: [
                RadioListTile<ThemeMode>(title: const Text('跟随系统'), value: ThemeMode.system, groupValue: theme,
                  onChanged: (v) { if (v != null) ref.read(themeProvider.notifier).setThemeMode(v); }),
                const Divider(height: 1),
                RadioListTile<ThemeMode>(title: const Text('浅色模式'), value: ThemeMode.light, groupValue: theme,
                  onChanged: (v) { if (v != null) ref.read(themeProvider.notifier).setThemeMode(v); }),
                const Divider(height: 1),
                RadioListTile<ThemeMode>(title: const Text('深色模式'), value: ThemeMode.dark, groupValue: theme,
                  onChanged: (v) { if (v != null) ref.read(themeProvider.notifier).setThemeMode(v); }),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _sectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
          color: Theme.of(context).colorScheme.primary)),
    );
  }

  void _showCityDialog(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();
    bool loading = false;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: const Text('设置城市'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: controller,
                    decoration: const InputDecoration(
                      labelText: '城市名或经纬度',
                      hintText: '如: 成都 或 30.57,104.07',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.my_location, size: 18),
                      label: const Text('定位当前位置'),
                      onPressed: loading ? null : () async {
                        setDialogState(() => loading = true);
                        final locator = LocatorService();
                        final result = await locator.getCurrentLocation();
                        setDialogState(() => loading = false);
                        if (result != null) controller.text = result['code']!;
                      },
                    ),
                  ),
                  if (loading) ...[
                    const SizedBox(height: 12),
                    const Center(child: CircularProgressIndicator()),
                  ],
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
                FilledButton(
                  onPressed: loading ? null : () async {
                    final input = controller.text.trim();
                    if (input.isEmpty) return;
                    String code = input;
                    String name = input;
                    if (!RegExp(r'^-?\d+\.?\d*,\s*-?\d+\.?\d*$').hasMatch(input)) {
                      setDialogState(() => loading = true);
                      final ws = WeatherService();
                      final results = await ws.searchCity('', input);
                      setDialogState(() => loading = false);
                      if (results.isNotEmpty) {
                        code = results.first['code']!;
                        name = results.first['name']!;
                      }
                    }
                    if (ctx.mounted) {
                      ref.read(settingsProvider.notifier).updateCity(code, name);
                      Navigator.pop(ctx);
                    }
                  },
                  child: const Text('保存'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
