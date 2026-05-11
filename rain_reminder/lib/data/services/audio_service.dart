import 'package:audioplayers/audioplayers.dart';

class AudioService {
  final AudioPlayer _player = AudioPlayer();
  bool _isPlaying = false;
  String? _currentSound;

  static const sounds = {
    'rain': '雨声',
    'wind': '风声',
    'forest': '森林',
    'stream': '流水',
  };

  Future<void> play(String key) async {
    if (_currentSound == key && _isPlaying) {
      await stop();
      return;
    }
    await stop();
    _currentSound = key;
    try {
      await _player.play(AssetSource('audio/$key.wav'));
      await _player.setReleaseMode(ReleaseMode.loop);
      _isPlaying = true;
    } catch (_) {}
  }

  Future<void> stop() async {
    _isPlaying = false;
    _currentSound = null;
    try { await _player.stop(); } catch (_) {}
  }

  bool get isPlaying => _isPlaying;
  String? get currentSound => _currentSound;

  void dispose() {
    _player.dispose();
  }
}
