import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/reminder_node.dart';
import '../../../data/services/tts_service.dart';
import '../../../presentation/providers/weather_provider.dart';
import '../../../presentation/providers/reminder_provider.dart';
import '../../../presentation/providers/settings_provider.dart';
import '../../../presentation/widgets/weather_card.dart';
import '../../../presentation/widgets/countdown_timer.dart';
import '../../../presentation/widgets/reminder_card.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Timer? _checkTimer;
  final _triggeredToday = <String>{};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(reminderProvider.notifier).initializePresets();
    });
    _startReminderCheck();
  }

  void _startReminderCheck() {
    _checkTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted) return;
      final reminders = ref.read(reminderProvider);
      final settings = ref.read(settingsProvider);
      if (!settings.notificationEnabled && !settings.voiceEnabled) return;
      _checkReminders(reminders, settings);
    });
  }

  void _checkReminders(List<ReminderNode> reminders, dynamic settings) {
    final now = DateTime.now();
    for (final r in reminders) {
      if (!r.enabled) continue;
      final key = '${r.id}_${now.year}_${now.month}_${now.day}';
      if (_triggeredToday.contains(key)) continue;
      final target = DateTime(now.year, now.month, now.day, r.hour, r.minute);
      final diff = target.difference(now).inMinutes.abs();
      if (diff <= 1 && now.isAfter(target.subtract(const Duration(minutes: 1)))) {
        _triggeredToday.add(key);
        ref.read(reminderProvider.notifier).triggerReminder(r);
      }
    }
    final today = '${now.year}_${now.month}_${now.day}';
    _triggeredToday.removeWhere((k) => !k.endsWith(today));
  }

  @override
  void dispose() {
    _checkTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final weather = ref.watch(weatherProvider);
    final reminders = ref.watch(reminderProvider);
    final settings = ref.watch(settingsProvider);

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nextReminder = _getNextReminder(reminders);
    final gradientTop = AppColors.weatherGradientTop(weather?.conditionText ?? '晴', isDark: isDark);
    final gradientBottom = AppColors.weatherGradientBottom(weather?.conditionText ?? '晴', isDark: isDark);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [gradientTop, gradientBottom],
          ),
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: Container(
                color: isDark ? Colors.black.withValues(alpha: 0.55) : Colors.black.withValues(alpha: 0.25),
              ),
            ),
            SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  WeatherCard(weather: weather),
                  const SizedBox(height: 10),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: () async {
                        await ref.read(weatherProvider.notifier).fetchWeather();
                        ref.read(reminderProvider.notifier).rescheduleAll();
                      },
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: Column(
                          children: [
                            if (nextReminder != null) ...[
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 20),
                                child: Text('下次提醒', style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8))),
                              ),
                              const SizedBox(height: 8),
                              CountdownTimer(reminder: nextReminder),
                            ],
                            const SizedBox(height: 24),
                            _buildTodayReminders(reminders),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ),
                  ),
                  _buildQuickActions(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  ReminderNode? _getNextReminder(List<ReminderNode> reminders) {
    final now = DateTime.now();
    ReminderNode? next;
    int? minMinutes;
    for (final r in reminders) {
      if (!r.enabled) continue;
      var target = DateTime(now.year, now.month, now.day, r.hour, r.minute);
      if (target.isBefore(now)) target = target.add(const Duration(days: 1));
      final diff = target.difference(now).inMinutes;
      if (minMinutes == null || diff < minMinutes) {
        minMinutes = diff;
        next = r;
      }
    }
    return next;
  }

  Widget _buildTodayReminders(List<ReminderNode> reminders) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('今日提醒', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.9))),
          const SizedBox(height: 12),
          SizedBox(
            height: 110,
            child: reminders.isEmpty
                ? Center(child: Text('暂无提醒', style: TextStyle(color: Colors.white.withOpacity(0.7))))
                : ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: reminders.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: ReminderCard(
                          reminder: reminders[index],
                          onTap: () => _showEditDialog(reminders[index]),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _ActionButton(icon: Icons.alarm_add, label: '提醒', active: true, onTap: () => Navigator.pushNamed(context, '/reminder')),
          _ActionButton(
            icon: ref.watch(settingsProvider).notificationEnabled ? Icons.notifications_active : Icons.notifications_off,
            label: '通知',
            active: ref.watch(settingsProvider).notificationEnabled,
            onTap: () => ref.read(settingsProvider.notifier).toggleNotification(),
          ),
          _ActionButton(
            icon: ref.watch(settingsProvider).voiceEnabled ? Icons.volume_up : Icons.volume_off,
            label: '语音',
            active: ref.watch(settingsProvider).voiceEnabled,
            onTap: () => ref.read(settingsProvider.notifier).toggleVoice(),
          ),
          _ActionButton(icon: Icons.settings, label: '设置', active: true, onTap: () => Navigator.pushNamed(context, '/settings')),
        ],
      ),
    );
  }

  void _showEditDialog(ReminderNode reminder) {
    final nameController = TextEditingController(text: reminder.name);
    TimeOfDay selectedTime = TimeOfDay(hour: reminder.hour, minute: reminder.minute);
    final messageController = TextEditingController(text: reminder.customMessage ?? '');

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: const Text('编辑提醒'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(controller: nameController, decoration: const InputDecoration(labelText: '场景名称', border: OutlineInputBorder())),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () async {
                        final picked = await showTimePicker(context: ctx, initialTime: selectedTime);
                        if (picked != null) setDialogState(() => selectedTime = picked);
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(labelText: '提醒时间', border: OutlineInputBorder(), suffixIcon: Icon(Icons.access_time)),
                        child: Text(selectedTime.format(context)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(controller: messageController, decoration: const InputDecoration(labelText: '自定义慰问语（可选）', border: OutlineInputBorder()), maxLines: 2),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
                TextButton(
                  onPressed: () {
                    ref.read(reminderProvider.notifier).deleteReminder(reminder.id);
                    Navigator.pop(ctx);
                  },
                  child: Text('删除', style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ),
                FilledButton(
                  onPressed: () {
                    if (nameController.text.trim().isNotEmpty) {
                      final updated = reminder.copyWith(
                        name: nameController.text.trim(),
                        hour: selectedTime.hour,
                        minute: selectedTime.minute,
                        customMessage: messageController.text.trim().isEmpty ? null : messageController.text.trim(),
                      );
                      ref.read(reminderProvider.notifier).updateReminder(updated);
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

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _ActionButton({required this.icon, required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: active ? Colors.white : Colors.white.withOpacity(0.4), size: 24),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: active ? Colors.white : Colors.white.withOpacity(0.4), fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
