import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  final FlutterTts _tts = FlutterTts();
  bool _initOk = false;

  Future<void> init() async {
    if (_initOk) return;
    try {
      await _tts.setLanguage('zh-CN');
      await _tts.setSpeechRate(1.0);
      await _tts.setPitch(1.0);
      await _tts.setVolume(1.0);
      _initOk = true;
    } catch (_) {}
  }

  Future<void> speak(String text, {double rate = 1.0}) async {
    if (text.isEmpty) return;
    await init();
    try {
      await _tts.setSpeechRate(rate);
      await _tts.speak(text);
    } catch (_) {}
  }

  Future<void> setSpeechRate(double rate) async {
    try {
      await _tts.setSpeechRate(rate);
    } catch (_) {}
  }

  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
  }
}
