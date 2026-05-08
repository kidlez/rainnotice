import 'package:flutter/material.dart';
import '../../data/models/reminder_node.dart';

class ReminderCard extends StatelessWidget {
  final ReminderNode reminder;
  final VoidCallback? onTap;

  const ReminderCard({super.key, required this.reminder, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
      width: 120,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: reminder.enabled
            ? Colors.white.withOpacity(0.15)
            : Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.1),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            backgroundColor: Colors.white.withOpacity(0.15),
            radius: 18,
            child: Icon(
              _getIcon(),
              color: Colors.white,
              size: 18,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            reminder.name,
            style: TextStyle(
              color: reminder.enabled ? Colors.white : Colors.white.withOpacity(0.4),
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            reminder.timeString,
            style: TextStyle(
              color: reminder.enabled
                  ? Colors.white.withOpacity(0.7)
                  : Colors.white.withOpacity(0.3),
              fontSize: 12,
            ),
          ),
        ],
      ),
      ),
    );
  }

  IconData _getIcon() {
    switch (reminder.name) {
      case '吃饭':
        return Icons.restaurant;
      case '喝水':
        return Icons.water_drop;
      case '运动':
        return Icons.fitness_center;
      case '休息':
        return Icons.bed;
      default:
        return Icons.alarm;
    }
  }
}
