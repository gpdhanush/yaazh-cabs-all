import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _phoneController = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppConstants.bgLight,
      appBar: AppBar(title: const Text('Password recovery')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.paddingL),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!_submitted) ...[
                Text(
                  'Reset your password',
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Password reset is managed by fleet admin. Enter your registered phone so ops can verify your account.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone number',
                    hintText: 'e.g. 9876543210',
                    prefixIcon: Icon(Icons.phone_rounded),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    if (_phoneController.text.trim().isNotEmpty) {
                      setState(() => _submitted = true);
                    }
                  },
                  child: const Text('SUBMIT REQUEST'),
                ),
              ] else ...[
                const Icon(
                  Icons.check_circle_outline_rounded,
                  color: AppConstants.gold,
                  size: 64,
                ),
                const SizedBox(height: 16),
                Text(
                  'Request submitted',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Your password reset request has been logged. Please contact fleet admin or check your SMS.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppConstants.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('BACK TO LOGIN'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
