import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

Future<TimeOfDay?> showScrollTimePicker(BuildContext context, TimeOfDay initial) {
  int hour = initial.hour;
  int minute = initial.minute;

  return showModalBottomSheet<TimeOfDay>(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setState) {
          return SizedBox(
            height: 280,
            child: Column(
              children: [
                // 确认/取消栏
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: Colors.grey.withValues(alpha: 0.2))),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('取消'),
                      ),
                      const Text('选择时间', style: TextStyle(fontWeight: FontWeight.w600)),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, TimeOfDay(hour: hour, minute: minute)),
                        child: const Text('确定'),
                      ),
                    ],
                  ),
                ),
                // 滑动滚轮
                Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 80,
                        child: CupertinoPicker(
                          scrollController: FixedExtentScrollController(initialItem: hour),
                          itemExtent: 40,
                          onSelectedItemChanged: (v) => setState(() => hour = v),
                          children: List.generate(24, (i) => Center(child: Text('$i'))),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text('时', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500)),
                      ),
                      SizedBox(
                        width: 80,
                        child: CupertinoPicker(
                          scrollController: FixedExtentScrollController(initialItem: minute),
                          itemExtent: 40,
                          onSelectedItemChanged: (v) => setState(() => minute = v),
                          children: List.generate(60, (i) => Center(child: Text(i.toString().padLeft(2, '0')))),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text('分', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      );
    },
  );
}
