import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'presentation/providers/theme_provider.dart';
import 'presentation/screens/home/home_screen.dart';
import 'presentation/screens/reminder/reminder_screen.dart';
import 'presentation/screens/settings/settings_screen.dart';

class RainReminderApp extends ConsumerWidget {
  const RainReminderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);

    return MaterialApp(
      title: '雨声提醒',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      home: const HomeScreen(),
      routes: {
        '/reminder': (_) => const ReminderScreen(),
        '/settings': (_) => const SettingsScreen(),
      },
    );
  }
}
