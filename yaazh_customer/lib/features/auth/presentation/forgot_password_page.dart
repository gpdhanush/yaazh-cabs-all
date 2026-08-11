import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/features/home/data/catalog_repository.dart';

class ForgotPasswordPage extends ConsumerWidget {
  const ForgotPasswordPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(title: const Text('Forgot password')),
      body: Padding(
        padding: const EdgeInsets.all(AppConstants.paddingL),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppConstants.borderLight),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lock_reset_rounded, size: 36, color: AppConstants.accentColor),
                  SizedBox(height: 12),
                  Text(
                    'Need a password reset?',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Call Yaazh Cabs support and we will reset your account from the operations desk. Online reset is not available yet.',
                    style: TextStyle(
                      height: 1.45,
                      color: AppConstants.textSecondaryLight,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
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
      ),
    );
  }
}
