import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/utils/time_picker.dart';
import '../../../data/models/reminder_node.dart';
import '../../../presentation/providers/reminder_provider.dart';

class ReminderScreen extends ConsumerStatefulWidget {
  const ReminderScreen({super.key});
  @override
  ConsumerState<ReminderScreen> createState() => _ReminderScreenState();
}

class _ReminderScreenState extends ConsumerState<ReminderScreen> {
  final _weekLabels = ['日', '一', '二', '三', '四', '五', '六'];

  @override
  Widget build(BuildContext context) {
    final reminders = ref.watch(reminderProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('提醒管理')),
      body: reminders.isEmpty
          ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.alarm_off, size: 64, color: Theme.of(context).colorScheme.outline),
              const SizedBox(height: 16),
              Text('暂无提醒', style: TextStyle(fontSize: 16, color: Theme.of(context).colorScheme.outline)),
              const SizedBox(height: 8),
              TextButton(onPressed: _showAddDialog, child: const Text('添加提醒')),
            ]))
          : ListView.builder(padding: const EdgeInsets.all(16), itemCount: reminders.length, itemBuilder: (ctx, idx) {
              return _buildItem(reminders[idx]);
            }),
      floatingActionButton: FloatingActionButton(onPressed: _showAddDialog, child: const Icon(Icons.add)),
    );
  }

  Widget _buildItem(ReminderNode r) {
    final theme = Theme.of(context);
    return Card(child: ListTile(
      leading: CircleAvatar(child: Icon(_icon(r.name), size: 20)),
      title: Text(r.name, style: TextStyle(fontWeight: FontWeight.w600, color: r.enabled ? null : theme.colorScheme.outline)),
      subtitle: Text('${r.timeString}  ${r.repeatLabel}', style: TextStyle(color: r.enabled ? theme.colorScheme.outline : theme.colorScheme.outline.withAlpha(128))),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        Switch(value: r.enabled, onChanged: (_) => ref.read(reminderProvider.notifier).toggleReminder(r.id)),
        IconButton(icon: const Icon(Icons.edit, size: 20), onPressed: () => _showEditDialog(r)),
        IconButton(icon: Icon(Icons.delete, size: 20, color: theme.colorScheme.error), onPressed: () => _delConfirm(r)),
      ]),
      onTap: () => ref.read(reminderProvider.notifier).toggleReminder(r.id),
    ));
  }

  IconData _icon(String name) {
    switch (name) {
      case '吃饭': return Icons.restaurant;
      case '喝水': return Icons.water_drop;
      case '运动': return Icons.fitness_center;
      case '休息': return Icons.bed;
      default: return Icons.alarm;
    }
  }

  // ──── 新增 ────

  void _showAddDialog() {
    final nameCtrl = TextEditingController();
    TimeOfDay time = const TimeOfDay(hour: 12, minute: 0);
    final msgCtrl = TextEditingController();
    int repeatDays = ReminderNode.everyDay;

    _showDialog('新增提醒', nameCtrl, time, msgCtrl, repeatDays, (nm, h, m, msg, rd) {
      ref.read(reminderProvider.notifier).addReminder(ReminderNode(
        id: const Uuid().v4(), name: nm, hour: h, minute: m, enabled: true,
        customMessage: msg.isEmpty ? null : msg, repeatDays: rd,
      ));
    });
  }

  // ──── 编辑 ────

  void _showEditDialog(ReminderNode r) {
    final nameCtrl = TextEditingController(text: r.name);
    TimeOfDay time = TimeOfDay(hour: r.hour, minute: r.minute);
    final msgCtrl = TextEditingController(text: r.customMessage ?? '');
    int repeatDays = r.repeatDays;

    _showDialog('编辑提醒', nameCtrl, time, msgCtrl, repeatDays, (nm, h, m, msg, rd) {
      ref.read(reminderProvider.notifier).updateReminder(r.copyWith(
        name: nm, hour: h, minute: m, customMessage: msg.isEmpty ? null : msg, repeatDays: rd,
      ));
    }, onDelete: () => ref.read(reminderProvider.notifier).deleteReminder(r.id));
  }

  void _showDialog(String title, TextEditingController nameCtrl, TimeOfDay initialTime,
      TextEditingController msgCtrl, int initialRepeat,
      Function(String name, int h, int m, String msg, int rd) onSave,
      {VoidCallback? onDelete}) {
    showDialog(context: context, builder: (ctx) {
      return StatefulBuilder(builder: (ctx, setDlg) {
        TimeOfDay time = initialTime;
        int repeatDays = initialRepeat;
        return AlertDialog(
          title: Text(title),
          content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: '场景名称', hintText: '如：吃饭、喝水', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            InkWell(
              onTap: () async {
                final p = await showScrollTimePicker(ctx, time);
                if (p != null) setDlg(() => time = p);
              },
              child: InputDecorator(decoration: const InputDecoration(labelText: '提醒时间', border: OutlineInputBorder(), suffixIcon: Icon(Icons.access_time)), child: Text(time.format(context))),
            ),
            const SizedBox(height: 12),
            TextField(controller: msgCtrl, decoration: const InputDecoration(labelText: '自定义慰问语（可选）', border: OutlineInputBorder()), maxLines: 1),
            const SizedBox(height: 12),
            _buildWeekSelector(repeatDays, (v) => setDlg(() => repeatDays = v)),
          ])),
          actions: [
            if (onDelete != null)
              TextButton(onPressed: () { onDelete(); Navigator.pop(ctx); }, child: Text('删除', style: TextStyle(color: Theme.of(context).colorScheme.error))),
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
            FilledButton(onPressed: () {
              if (nameCtrl.text.trim().isNotEmpty) {
                onSave(nameCtrl.text.trim(), time.hour, time.minute, msgCtrl.text.trim(), repeatDays);
                Navigator.pop(ctx);
              }
            }, child: const Text('保存')),
          ],
        );
      });
    });
  }

  void _delConfirm(ReminderNode r) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      title: const Text('删除提醒'),
      content: Text('确定要删除「${r.name}」提醒吗？'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
        FilledButton(onPressed: () { ref.read(reminderProvider.notifier).deleteReminder(r.id); Navigator.pop(ctx); },
          style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
          child: const Text('删除')),
      ],
    ));
  }

  Widget _buildWeekSelector(int current, ValueChanged<int> onChanged) {
    final theme = Theme.of(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('重复日', style: TextStyle(fontSize: 12, color: theme.colorScheme.outline)),
      const SizedBox(height: 6),
      Wrap(spacing: 4, children: [
        _weekBtn('每天', 127, current, onChanged),
        _weekBtn('工作日', 62, current, onChanged),
        _weekBtn('周末', 65, current, onChanged),
      ]),
      const SizedBox(height: 6),
      Wrap(spacing: 4, children: List.generate(7, (i) {
        final bit = 1 << i; final sel = (current >> i) & 1 == 1;
        return GestureDetector(
          onTap: () => onChanged(current ^ bit),
          child: Container(width: 30, height: 30, alignment: Alignment.center,
            decoration: BoxDecoration(color: sel ? theme.colorScheme.primary : Colors.grey.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(15)),
            child: Text(_weekLabels[i], style: TextStyle(color: sel ? Colors.white : theme.colorScheme.outline, fontSize: 11, fontWeight: FontWeight.w600)),
          ),
        );
      })),
    ]);
  }

  Widget _weekBtn(String label, int value, int current, ValueChanged<int> onChanged) {
    final sel = current == value;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: sel ? Theme.of(context).colorScheme.primary : Colors.grey.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14)),
        child: Text(label, style: TextStyle(fontSize: 11, color: sel ? Colors.white : Theme.of(context).colorScheme.outline)),
      ),
    );
  }
}
