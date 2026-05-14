import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

Future<TimeOfDay?> showScrollTimePicker(BuildContext context, TimeOfDay initial) {
  int hour = initial.hour;
  int minute = initial.minute;

  return showDialog<TimeOfDay>(
    context: context,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      final isDark = theme.brightness == Brightness.dark;

      return StatefulBuilder(
        builder: (ctx, setState) {
          return AlertDialog(
            title: const Text('选择时间'),
            titlePadding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            content: SizedBox(
              height: 200,
              child: Row(
                children: [
                  // 小时
                  Expanded(
                    child: CupertinoTheme(
                      data: CupertinoThemeData(
                        brightness: isDark ? Brightness.dark : Brightness.light,
                      ),
                      child: CupertinoPicker(
                        scrollController: FixedExtentScrollController(initialItem: hour),
                        itemExtent: 44,
                        magnification: 1.15,
                        squeeze: 1.1,
                        onSelectedItemChanged: (v) => setState(() => hour = v),
                        selectionOverlay: CupertinoPickerDefaultSelectionOverlay(
                          background: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                        ),
                        children: List.generate(24, (i) => Center(
                          child: Text('$i', style: const TextStyle(fontSize: 22)),
                        )),
                      ),
                    ),
                  ),
                  Text('时', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: theme.colorScheme.outline)),
                  const SizedBox(width: 12),
                  // 分钟
                  Expanded(
                    child: CupertinoTheme(
                      data: CupertinoThemeData(
                        brightness: isDark ? Brightness.dark : Brightness.light,
                      ),
                      child: CupertinoPicker(
                        scrollController: FixedExtentScrollController(initialItem: minute),
                        itemExtent: 44,
                        magnification: 1.15,
                        squeeze: 1.1,
                        onSelectedItemChanged: (v) => setState(() => minute = v),
                        selectionOverlay: CupertinoPickerDefaultSelectionOverlay(
                          background: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                        ),
                        children: List.generate(60, (i) => Center(
                          child: Text(i.toString().padLeft(2, '0'), style: const TextStyle(fontSize: 22)),
                        )),
                      ),
                    ),
                  ),
                  Text('分', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: theme.colorScheme.outline)),
                ],
              ),
            ),
            actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('取消'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, TimeOfDay(hour: hour, minute: minute)),
                child: const Text('确定'),
              ),
            ],
          );
        },
      );
    },
  );
}
