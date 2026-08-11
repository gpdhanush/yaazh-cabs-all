import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_customer/features/auth/presentation/auth_scaffold.dart';
import 'package:yaazh_customer/features/home/data/catalog_repository.dart';

class ForgotPasswordPage extends ConsumerWidget {
  const ForgotPasswordPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);

    return AuthScaffold(
      showBack: true,
      title: 'Forgot password',
      subtitle:
          'Call Yaazh Cabs support and we will reset your account from the operations desk. Online reset is not available yet.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          config.when(
            data: (data) {
              final phone = data.supportPhone ?? '04252222222';
              return ElevatedButton.icon(
                onPressed: () => launchUrl(Uri.parse('tel:$phone')),
                icon: const Icon(Icons.phone_rounded),
                label: Text('CALL $phone'),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => ElevatedButton.icon(
              onPressed: () => launchUrl(Uri.parse('tel:04252222222')),
              icon: const Icon(Icons.phone_rounded),
              label: const Text('CALL SUPPORT'),
            ),
          ),
        ],
      ),
    );
  }
}
