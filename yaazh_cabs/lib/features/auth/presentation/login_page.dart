import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_cabs/app/constants.dart';
import 'package:yaazh_cabs/core/firebase/analytics_service.dart';
import 'package:yaazh_cabs/core/widgets/app_logo.dart';
import 'package:yaazh_cabs/core/network/connectivity_provider.dart';
import 'package:yaazh_cabs/core/widgets/app_state_pages.dart';
import 'package:yaazh_cabs/features/auth/presentation/auth_viewmodel.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onLoginSubmitted() async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!_formKey.currentState!.validate()) return;
    final success = await ref.read(authNotifierProvider.notifier).login(
          _phoneController.text.trim(),
          _passwordController.text,
        );
    if (!mounted) return;
    if (success) {
      ref.read(analyticsServiceProvider).logLogin();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final isLoading = authState.status == AuthStatus.loading;
    final online = ref.watch(isOnlineProvider);
    final theme = Theme.of(context);

    if (!online) {
      return OfflinePage(
        onRetry: () => ref.invalidate(connectivityStatusProvider),
      );
    }

    return GestureDetector(
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: Scaffold(
        backgroundColor: AppConstants.white,
        body: Column(
          children: [
            Container(
              width: double.infinity,
              color: AppConstants.navy,
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
                  child: Column(
                    children: [
                      const AppLogo(size: 88),
                      const SizedBox(height: 16),
                      Text(
                        'Yaazh Cabs',
                        style: theme.textTheme.displaySmall?.copyWith(
                          color: AppConstants.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Driver workspace',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppConstants.white.withValues(alpha: 0.72),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(
              child: SafeArea(
                top: false,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 16),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Sign in', style: theme.textTheme.headlineSmall),
                        const SizedBox(height: 6),
                        Text(
                          'Use your registered driver phone and password.',
                          style: theme.textTheme.bodySmall,
                        ),
                        const SizedBox(height: 24),
                        if (authState.status == AuthStatus.error &&
                            authState.errorMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppConstants.errorColor.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              authState.errorMessage!,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppConstants.errorColor,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                        ],
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.number,
                          textInputAction: TextInputAction.next,
                          maxLength: 10,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(10),
                          ],
                          decoration: const InputDecoration(
                            labelText: 'Phone number',
                            hintText: '9876543210',
                            prefixIcon: Icon(Icons.phone_rounded),
                            counterText: '',
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Enter your phone number';
                            }
                            if (value.trim().length != 10) {
                              return 'Enter a valid 10-digit number';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _onLoginSubmitted(),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline_rounded),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                              ),
                              onPressed: () => setState(
                                () => _obscurePassword = !_obscurePassword,
                              ),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Enter your password';
                            }
                            return null;
                          },
                        ),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () => context.push('/forgot-password'),
                            child: const Text('Forgot password?'),
                          ),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: isLoading ? null : _onLoginSubmitted,
                          child: isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppConstants.black,
                                  ),
                                )
                              : const Text('CONTINUE'),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          'Version ${AppConstants.appVersion}',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
