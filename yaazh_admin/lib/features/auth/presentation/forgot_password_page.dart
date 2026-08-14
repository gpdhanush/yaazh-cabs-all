import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/network/api_client.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_scaffold.dart';

final _supportPhoneProvider = FutureProvider<String>((ref) async {
  try {
    final data = await ref.read(apiClientProvider).get(
          '/public/app-config',
          silent: true,
        );
    if (data is Map) {
      final settings = data['settings'];
      if (settings is Map) {
        final phone = settings['support_phone']?.toString();
        if (phone != null && phone.isNotEmpty) return phone;
      }
    }
  } catch (_) {}
  return AppConstants.fallbackSupportPhone;
});

class ForgotPasswordPage extends ConsumerWidget {
  const ForgotPasswordPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phoneAsync = ref.watch(_supportPhoneProvider);

    return AuthScaffold(
      showBack: true,
      title: 'Forgot password',
      subtitle:
          'Online reset is not available. Call Yaazh support and we will reset your admin account from the operations desk.',
      child: phoneAsync.when(
        data: (phone) => ElevatedButton.icon(
          onPressed: () {
            hideKeyboard();
            launchUrl(Uri.parse('tel:$phone'));
          },
          icon: const Icon(Icons.phone_rounded),
          label: Text('CALL $phone'),
        ),
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: YaLoader(),
          ),
        ),
        error: (_, _) => ElevatedButton.icon(
          onPressed: () {
            hideKeyboard();
            launchUrl(Uri.parse('tel:${AppConstants.fallbackSupportPhone}'));
          },
          icon: const Icon(Icons.phone_rounded),
          label: const Text('CALL SUPPORT'),
        ),
      ),
    );
  }
}
