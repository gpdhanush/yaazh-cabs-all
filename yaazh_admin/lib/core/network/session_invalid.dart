import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Bumped when a refresh token fails so the router can send the user to login.
final authSessionInvalidProvider = StateProvider<int>((ref) => 0);
