import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/network/connectivity_provider.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_scaffold.dart';
import 'package:yaazh_admin/features/auth/presentation/auth_viewmodel.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onLoginSubmitted() async {
    hideKeyboard();
    if (!_formKey.currentState!.validate()) return;
    final success = await ref.read(authNotifierProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
        );
    if (!mounted) return;
    if (success) {
      showSuccessToast('Welcome back');
      context.go('/home');
    } else {
      final message = ref.read(authNotifierProvider).errorMessage;
      if (message != null) showErrorToast(message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final isLoading = authState.status == AuthStatus.loading;
    final online = ref.watch(isOnlineProvider);

    return AuthScaffold(
      title: 'Sign in',
      subtitle: 'Enter your admin email and password.',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!online) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'You appear to be offline. Connect to the internet to sign in.',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(height: 14),
            ],
            if (authState.status == AuthStatus.error && authState.errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.salmon.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  authState.errorMessage!,
                  style: const TextStyle(
                    color: AppColors.salmon,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],
            YaTextField(
              label: 'Email',
              required: true,
              hint: 'admin@yaazh.local',
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              prefixIcon: const Icon(Icons.mail_outline_rounded),
              validator: (value) {
                final email = value?.trim() ?? '';
                if (email.isEmpty) return 'Enter your email';
                if (!email.contains('@') || !email.contains('.')) {
                  return 'Enter a valid email';
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            YaPasswordField(
              label: 'Password',
              required: true,
              controller: _passwordController,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.password],
              onFieldSubmitted: (_) => _onLoginSubmitted(),
              validator: (value) {
                if (value == null || value.isEmpty) return 'Enter your password';
                return null;
              },
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {
                  hideKeyboard();
                  context.push('/forgot-password');
                },
                child: const Text('Forgot password?'),
              ),
            ),
            const SizedBox(height: 4),
            ElevatedButton(
              onPressed: isLoading ? null : _onLoginSubmitted,
              child: isLoading
                  ? SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                    )
                  : const Text('SIGN IN'),
            ),
          ],
        ),
      ),
    );
  }
}
