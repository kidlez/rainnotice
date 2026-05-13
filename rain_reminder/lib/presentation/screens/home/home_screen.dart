import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/time_picker.dart';
import '../../../core/utils/date_utils.dart';
import '../../../core/utils/lunar_utils.dart';
import '../../../data/models/reminder_node.dart';
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
    _scheduleNextCheck();
  }

  void _scheduleNextCheck() {
    _checkTimer?.cancel();
    final reminders = ref.read(reminderProvider);
    final now = DateTime.now();
    DateTime? nextTime;

    for (final r in reminders) {
      if (!r.enabled) continue;
      if (!r.isDueOn(now)) continue;
      var target = DateTime(now.year, now.month, now.day, r.hour, r.minute);
      if (target.isBefore(now)) target = target.add(const Duration(days: 1));
      if (!r.isDueOn(target)) continue;
      if (nextTime == null || target.isBefore(nextTime)) nextTime = target;
    }

    if (nextTime == null) {
      _checkTimer = Timer(const Duration(minutes: 5), _scheduleNextCheck);
      return;
    }

    final delay = nextTime.difference(now);
    if (delay.inSeconds <= 0) {
      _fireReminders();
      _scheduleNextCheck();
      return;
    }

    _checkTimer = Timer(delay + const Duration(seconds: 2), () {
      if (mounted) {
        _fireReminders();
        _scheduleNextCheck();
      }
    });
  }

  void _fireReminders() {
    final reminders = ref.read(reminderProvider);
    final now = DateTime.now();
    for (final r in reminders) {
      if (!r.enabled) continue;
      if (!r.isDueOn(now)) continue;
      final key = '${r.id}_${now.year}_${now.month}_${now.day}';
      if (_triggeredToday.contains(key)) continue;

      final target = DateTime(now.year, now.month, now.day, r.hour, r.minute);
      final diff = (now.difference(target)).inMinutes.abs();
      if (diff <= 1) {
        _triggeredToday.add(key);
        ref.read(reminderProvider.notifier).triggerReminder(r);
        if (mounted) _showSnoozeBar(r);
      }
    }
    final today = '${now.year}_${now.month}_${now.day}';
    _triggeredToday.removeWhere((k) => !k.endsWith(today));
  }

  void _showSnoozeBar(ReminderNode r) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('${r.name}时间到了'),
      duration: const Duration(seconds: 8),
      action: SnackBarAction(
        label: '10分钟后提醒',
        onPressed: () {
          final snoozed = r.copyWith(
            id: 'snooze_${DateTime.now().millisecondsSinceEpoch}',
            hour: DateTime.now().add(const Duration(minutes: 10)).hour,
            minute: DateTime.now().add(const Duration(minutes: 10)).minute,
          );
          ref.read(reminderProvider.notifier).addReminder(snoozed);
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('已设置10分钟后提醒'),
            duration: Duration(seconds: 2),
          ));
        },
      ),
    ));
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nextReminder = _getNextReminder(reminders);
    final gradientTop = AppColors.weatherGradientTop(weather?.conditionText ?? '晴', isDark: isDark);
    final gradientBottom = AppColors.weatherGradientBottom(weather?.conditionText ?? '晴', isDark: isDark);
    final lastFetched = ref.read(weatherProvider.notifier).lastFetched;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: LinearGradient(
          begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [gradientTop, gradientBottom],
        )),
        child: Stack(
          children: [
            Positioned.fill(child: Container(
              color: isDark ? Colors.black.withValues(alpha: 0.55) : Colors.black.withValues(alpha: 0.25),
            )),
            SafeArea(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(getTimeGreeting(),
                    style: const TextStyle(fontSize: 15, color: Colors.white, fontWeight: FontWeight.w500)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(getLunarDisplayText(),
                    style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.55))),
                ),
                const SizedBox(height: 4),
                WeatherCard(weather: weather, lastUpdated: lastFetched),
                const SizedBox(height: 10),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () async {
                      await ref.read(weatherProvider.notifier).fetchWeather();
                      ref.read(reminderProvider.notifier).rescheduleAll();
                      _scheduleNextCheck();
                    },
                    child: SingleChildScrollView(physics: const AlwaysScrollableScrollPhysics(), child: Column(children: [
                      if (nextReminder != null) ...[
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Text('下次提醒', style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.8))),
                        ),
                        const SizedBox(height: 8),
                        CountdownTimer(reminder: nextReminder),
                      ],
                      const SizedBox(height: 24),
                      _buildTodayReminders(reminders),
                      const SizedBox(height: 16),
                    ])),
                  ),
                ),
                _buildQuickActions(),
                const SizedBox(height: 24),
              ]),
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
      if (!r.isDueOn(now)) continue;
      var target = DateTime(now.year, now.month, now.day, r.hour, r.minute);
      if (target.isBefore(now)) target = target.add(const Duration(days: 1));
      if (!r.isDueOn(target)) continue;
      final diff = target.difference(now).inMinutes;
      if (minMinutes == null || diff < minMinutes) { minMinutes = diff; next = r; }
    }
    return next;
  }

  Widget _buildTodayReminders(List<ReminderNode> reminders) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('今日提醒', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white.withValues(alpha: 0.9))),
        const SizedBox(height: 12),
        SizedBox(height: 110, child: reminders.isEmpty
          ? Center(child: Text('暂无提醒', style: TextStyle(color: Colors.white.withValues(alpha: 0.7))))
          : ListView.builder(scrollDirection: Axis.horizontal, itemCount: reminders.length,
              itemBuilder: (ctx, idx) => Padding(padding: const EdgeInsets.only(right: 12),
                child: ReminderCard(reminder: reminders[idx], onTap: () => _showEditDialog(reminders[idx])),
              ),
            ),
        ),
      ]),
    );
  }

  Widget _buildQuickActions() {
    final s = ref.watch(settingsProvider);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
        _act(Icons.alarm_add, '提醒', true, () => Navigator.pushNamed(context, '/reminder')),
        _act(s.notificationEnabled ? Icons.notifications_active : Icons.notifications_off, '通知', s.notificationEnabled, () => ref.read(settingsProvider.notifier).toggleNotification()),
        _act(s.voiceEnabled ? Icons.volume_up : Icons.volume_off, '语音', s.voiceEnabled, () => ref.read(settingsProvider.notifier).toggleVoice()),
        _act(Icons.settings, '设置', true, () => Navigator.pushNamed(context, '/settings')),
      ]),
    );
  }

  Widget _act(IconData icon, String label, bool active, VoidCallback onTap) {
    return GestureDetector(onTap: onTap, child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(18)),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, color: active ? Colors.white : Colors.white.withValues(alpha: 0.4), size: 22),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(color: active ? Colors.white : Colors.white.withValues(alpha: 0.4), fontSize: 11)),
      ]),
    ));
  }

  // ──── 编辑弹窗（含工作日选择） ────

  final _weekLabels = ['日', '一', '二', '三', '四', '五', '六'];

  void _showEditDialog(ReminderNode reminder) {
    final nameCtrl = TextEditingController(text: reminder.name);
    TimeOfDay selectedTime = TimeOfDay(hour: reminder.hour, minute: reminder.minute);
    final msgCtrl = TextEditingController(text: reminder.customMessage ?? '');
    int repeatDays = reminder.repeatDays;

    showDialog(context: context, builder: (ctx) {
      return StatefulBuilder(builder: (ctx, setDlg) {
        return AlertDialog(
          title: const Text('编辑提醒'),
          content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: '场景名称', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            InkWell(
              onTap: () async {
                final p = await showScrollTimePicker(ctx, selectedTime);
                if (p != null) setDlg(() => selectedTime = p);
              },
              child: InputDecorator(
                decoration: const InputDecoration(labelText: '提醒时间', border: OutlineInputBorder(), suffixIcon: Icon(Icons.access_time)),
                child: Text(selectedTime.format(context)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(controller: msgCtrl, decoration: const InputDecoration(labelText: '自定义慰问语（可选）', border: OutlineInputBorder()), maxLines: 1),
            const SizedBox(height: 12),
            _buildWeekSelector(repeatDays, (v) => setDlg(() => repeatDays = v)),
          ])),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
            TextButton(onPressed: () {
              ref.read(reminderProvider.notifier).deleteReminder(reminder.id);
              Navigator.pop(ctx);
            }, child: Text('删除', style: TextStyle(color: Theme.of(context).colorScheme.error))),
            FilledButton(onPressed: () {
              if (nameCtrl.text.trim().isNotEmpty) {
                ref.read(reminderProvider.notifier).updateReminder(reminder.copyWith(
                  name: nameCtrl.text.trim(), hour: selectedTime.hour, minute: selectedTime.minute,
                  customMessage: msgCtrl.text.trim().isEmpty ? null : msgCtrl.text.trim(),
                  repeatDays: repeatDays,
                ));
                Navigator.pop(ctx);
                _scheduleNextCheck();
              }
            }, child: const Text('保存')),
          ],
        );
      });
    });
  }

  Widget _buildWeekSelector(int current, ValueChanged<int> onChanged) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('重复日', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
      const SizedBox(height: 6),
      Wrap(spacing: 4, children: [
        _weekQuick('每天', 127, current, onChanged),
        _weekQuick('工作日', 62, current, onChanged),
        _weekQuick('周末', 65, current, onChanged),
      ]),
      const SizedBox(height: 6),
      Wrap(spacing: 4, children: List.generate(7, (i) {
        final bit = 1 << i;
        final selected = (current >> i) & 1 == 1;
        return GestureDetector(
          onTap: () => onChanged(current ^ bit),
          child: Container(
            width: 32, height: 32, alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? Theme.of(context).colorScheme.primary : Colors.grey.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(_weekLabels[i], style: TextStyle(
              color: selected ? Colors.white : Theme.of(context).colorScheme.outline, fontSize: 12, fontWeight: FontWeight.w600,
            )),
          ),
        );
      })),
    ]);
  }

  Widget _weekQuick(String label, int value, int current, ValueChanged<int> onChanged) {
    final selected = current == value;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? Theme.of(context).colorScheme.primary : Colors.grey.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(label, style: TextStyle(fontSize: 11, color: selected ? Colors.white : Theme.of(context).colorScheme.outline)),
      ),
    );
  }
}
