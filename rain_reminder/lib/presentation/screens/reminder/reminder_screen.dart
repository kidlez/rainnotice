import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../data/models/reminder_node.dart';
import '../../../presentation/providers/reminder_provider.dart';
import '../../../presentation/providers/settings_provider.dart';

class ReminderScreen extends ConsumerStatefulWidget {
  const ReminderScreen({super.key});

  @override
  ConsumerState<ReminderScreen> createState() => _ReminderScreenState();
}

class _ReminderScreenState extends ConsumerState<ReminderScreen> {
  @override
  Widget build(BuildContext context) {
    final reminders = ref.watch(reminderProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('提醒管理'),
      ),
      body: reminders.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.alarm_off, size: 64, color: theme.colorScheme.outline),
                  const SizedBox(height: 16),
                  Text(
                    '暂无提醒',
                    style: TextStyle(
                      fontSize: 16,
                      color: theme.colorScheme.outline,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _showAddDialog,
                    child: const Text('添加提醒'),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: reminders.length,
              itemBuilder: (context, index) {
                final reminder = reminders[index];
                return _buildReminderItem(reminder);
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildReminderItem(ReminderNode reminder) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: _getReminderIcon(reminder.name),
        title: Text(
          reminder.name,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: reminder.enabled ? null : theme.colorScheme.outline,
          ),
        ),
        subtitle: Text(
          reminder.timeString,
          style: TextStyle(
            color: reminder.enabled ? theme.colorScheme.outline : theme.colorScheme.outline.withOpacity(0.5),
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Switch(
              value: reminder.enabled,
              onChanged: (_) {
                ref.read(reminderProvider.notifier).toggleReminder(reminder.id);
              },
            ),
            IconButton(
              icon: const Icon(Icons.edit, size: 20),
              onPressed: () => _showEditDialog(reminder),
            ),
            IconButton(
              icon: Icon(Icons.delete, size: 20, color: theme.colorScheme.error),
              onPressed: () => _showDeleteConfirm(reminder),
            ),
          ],
        ),
        onTap: () {
          ref.read(reminderProvider.notifier).toggleReminder(reminder.id);
        },
      ),
    );
  }

  Widget _getReminderIcon(String name) {
    IconData icon;
    switch (name) {
      case '吃饭':
        icon = Icons.restaurant;
        break;
      case '喝水':
        icon = Icons.water_drop;
        break;
      case '运动':
        icon = Icons.fitness_center;
        break;
      case '休息':
        icon = Icons.bed;
        break;
      default:
        icon = Icons.alarm;
    }
    return CircleAvatar(
      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      child: Icon(icon, size: 20),
    );
  }

  void _showAddDialog() {
    final nameController = TextEditingController();
    TimeOfDay selectedTime = const TimeOfDay(hour: 12, minute: 0);
    final messageController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: const Text('新增提醒'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: '场景名称',
                        hintText: '如：吃饭、喝水、运动...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () async {
                        final picked = await showTimePicker(
                          context: ctx,
                          initialTime: selectedTime,
                        );
                        if (picked != null) {
                          setDialogState(() {
                            selectedTime = picked;
                          });
                        }
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: '提醒时间',
                          border: OutlineInputBorder(),
                          suffixIcon: Icon(Icons.access_time),
                        ),
                        child: Text(selectedTime.format(context)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: messageController,
                      decoration: const InputDecoration(
                        labelText: '自定义慰问语（可选）',
                        hintText: '留空使用默认慰问语',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('取消'),
                ),
                FilledButton(
                  onPressed: () {
                    if (nameController.text.trim().isNotEmpty) {
                      final node = ReminderNode(
                        id: const Uuid().v4(),
                        name: nameController.text.trim(),
                        hour: selectedTime.hour,
                        minute: selectedTime.minute,
                        enabled: true,
                        customMessage: messageController.text.trim().isEmpty
                            ? null
                            : messageController.text.trim(),
                      );
                      ref.read(reminderProvider.notifier).addReminder(node);
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
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: '场景名称',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () async {
                        final picked = await showTimePicker(
                          context: ctx,
                          initialTime: selectedTime,
                        );
                        if (picked != null) {
                          setDialogState(() {
                            selectedTime = picked;
                          });
                        }
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: '提醒时间',
                          border: OutlineInputBorder(),
                          suffixIcon: Icon(Icons.access_time),
                        ),
                        child: Text(selectedTime.format(context)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: messageController,
                      decoration: const InputDecoration(
                        labelText: '自定义慰问语（可选）',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('取消'),
                ),
                FilledButton(
                  onPressed: () {
                    if (nameController.text.trim().isNotEmpty) {
                      final updated = reminder.copyWith(
                        name: nameController.text.trim(),
                        hour: selectedTime.hour,
                        minute: selectedTime.minute,
                        customMessage: messageController.text.trim().isEmpty
                            ? null
                            : messageController.text.trim(),
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

  void _showDeleteConfirm(ReminderNode reminder) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除提醒'),
        content: Text('确定要删除「${reminder.name}」提醒吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(reminderProvider.notifier).deleteReminder(reminder.id);
              Navigator.pop(ctx);
            },
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }
}
