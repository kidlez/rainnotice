import 'dart:convert';
import 'dart:math';
import 'package:flutter/services.dart' show rootBundle;
import '../models/app_settings.dart';

class MessageLoader {
  String _locale = 'zh-cn';

  Map<String, List<String>> _toxicMessages = {};
  Map<String, List<String>> _warmMessages = {};
  List<String> _rainMessages = [];
  Map<String, Map<String, dynamic>> _presets = {};

  // 洗牌队列：每个场景维护去重队列
  final Map<String, List<String>> _decks = {};

  Future<void> load([String? locale]) async {
    if (locale != null) _locale = locale;

    _toxicMessages = await _loadCategory('$_locale/toxic.json');
    _warmMessages = await _loadCategory('$_locale/warm.json');
    _rainMessages = await _loadRain('$_locale/rain.json');
    _presets = await _loadPresets('$_locale/presets.json');
    _decks.clear();
  }

  Future<Map<String, List<String>>> _loadCategory(String path) async {
    try {
      final content = await rootBundle.loadString('assets/i18n/$path');
      final map = jsonDecode(content) as Map<String, dynamic>;
      return map.map((k, v) => MapEntry(k, List<String>.from(v as List)));
    } catch (_) {
      return {};
    }
  }

  Future<List<String>> _loadRain(String path) async {
    try {
      final content = await rootBundle.loadString('assets/i18n/$path');
      final map = jsonDecode(content) as Map<String, dynamic>;
      return List<String>.from(map['messages'] as List);
    } catch (_) {
      return ['记得带伞'];
    }
  }

  Future<Map<String, Map<String, dynamic>>> _loadPresets(String path) async {
    try {
      final content = await rootBundle.loadString('assets/i18n/$path');
      final map = jsonDecode(content) as Map<String, dynamic>;
      return map.map((k, v) => MapEntry(k, Map<String, dynamic>.from(v as Map)));
    } catch (_) {
      return {};
    }
  }

  Map<String, Map<String, String>> getPresets() {
    return _presets.map((k, v) => MapEntry(k, {
      'hour': v['hour'].toString(),
      'minute': v['minute'].toString(),
      'toxic': _toxicMessages[k]?.firstOrNull ?? '',
      'warm': _warmMessages[k]?.firstOrNull ?? '',
    }));
  }

  String getMessage(String category, MessageStyle style) {
    final messages = style == MessageStyle.toxic ? _toxicMessages : _warmMessages;
    final list = messages[category] ?? messages['default'] ?? ['该休息一下了'];

    if (list.isEmpty) return '该休息一下了';

    final deckKey = '${style.name}_$category';
    var deck = _decks[deckKey];

    if (deck == null || deck.isEmpty) {
      deck = List<String>.from(list);
      deck.shuffle(Random());
      _decks[deckKey] = deck;
    }

    return deck.removeLast();
  }

  String getRandomRainMessage() {
    if (_rainMessages.isEmpty) return '记得带伞';
    var deck = _decks['rain'];
    if (deck == null || deck.isEmpty) {
      deck = List<String>.from(_rainMessages);
      deck.shuffle(Random());
      _decks['rain'] = deck;
    }
    return deck.removeLast();
  }

  String get locale => _locale;
}
