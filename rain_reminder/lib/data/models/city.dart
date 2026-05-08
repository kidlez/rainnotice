import 'package:uuid/uuid.dart';

class City {
  final String id;
  final String name;
  final String? code;

  const City({
    required this.id,
    required this.name,
    this.code,
  });

  factory City.create(String name, {String? code}) {
    return City(
      id: const Uuid().v4(),
      name: name,
      code: code,
    );
  }
}
