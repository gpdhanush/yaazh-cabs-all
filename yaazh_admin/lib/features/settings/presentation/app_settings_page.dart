import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/app/theme.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/theme/brand_colors.dart';
import 'package:yaazh_admin/core/theme/theme_controller.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/features/settings/data/web_settings_repository.dart';
import 'package:yaazh_admin/features/shell/admin_shell.dart';

class AppSettingsPage extends ConsumerWidget {
  const AppSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeState = ref.watch(appThemeProvider);
    final theme = Theme.of(context);

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          leading: const YaDrawerButton(),
          title: const Text('Settings'),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            Text('Appearance', style: theme.textTheme.titleMedium),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final option in const [
                  (ThemeMode.light, 'Light', Icons.light_mode_outlined),
                  (ThemeMode.dark, 'Dark', Icons.dark_mode_outlined),
                  (ThemeMode.system, 'System', Icons.phone_iphone_rounded),
                ])
                  ChoiceChip(
                    label: Text(
                      option.$2,
                      style: TextStyle(
                        color: themeState.mode == option.$1
                            ? theme.colorScheme.onPrimary
                            : theme.colorScheme.onSurface,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    avatar: Icon(
                      option.$3,
                      size: 18,
                      color: themeState.mode == option.$1
                          ? theme.colorScheme.onPrimary
                          : theme.colorScheme.onSurface,
                    ),
                    selected: themeState.mode == option.$1,
                    selectedColor: theme.colorScheme.primary,
                    backgroundColor: theme.colorScheme.surface,
                    side: BorderSide(color: theme.dividerColor),
                    showCheckmark: false,
                    onSelected: (_) {
                      hideKeyboard();
                      ref.read(appThemeProvider.notifier).setMode(option.$1);
                    },
                  ),
              ],
            ),
            const SizedBox(height: 24),
            Text('Admin colours', style: theme.textTheme.titleMedium),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                const spacing = 8.0;
                final cols = constraints.maxWidth >= 520 ? 4 : 3;
                final width =
                    (constraints.maxWidth - spacing * (cols - 1)) / cols;
                return Wrap(
                  spacing: spacing,
                  runSpacing: spacing,
                  children: [
                    for (final swatch in AppConstants.themeSwatches)
                      SizedBox(
                        width: width,
                        height: 52,
                        child: _ColorTile(
                          name: swatch.name,
                          color: swatch.color,
                          selected: themeState.primary.toARGB32() ==
                              swatch.color.toARGB32(),
                          onTap: () async {
                            hideKeyboard();
                            await ref
                                .read(appThemeProvider.notifier)
                                .setPrimary(swatch.color);
                            try {
                              await ref
                                  .read(webSettingsRepositoryProvider)
                                  .update('admin_primary_color', colorToHex(swatch.color));
                            } catch (e) {
                              showErrorToast(
                                e is ApiException ? e.message : e.toString(),
                              );
                            }
                          },
                        ),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            Text('Secondary colour', style: theme.textTheme.titleMedium),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                const spacing = 8.0;
                final cols = constraints.maxWidth >= 520 ? 4 : 3;
                final width =
                    (constraints.maxWidth - spacing * (cols - 1)) / cols;
                const secondarySwatches = <({String name, Color color})>[
                  (name: 'Charcoal', color: Color(0xFF1F2933)),
                  (name: 'Navy', color: Color(0xFF0F172A)),
                  (name: 'Slate', color: Color(0xFF334155)),
                  (name: 'Ink', color: Color(0xFF111827)),
                  (name: 'Graphite', color: Color(0xFF374151)),
                  (name: 'Deep', color: Color(0xFF1E293B)),
                ];
                return Wrap(
                  spacing: spacing,
                  runSpacing: spacing,
                  children: [
                    for (final swatch in secondarySwatches)
                      SizedBox(
                        width: width,
                        height: 52,
                        child: _ColorTile(
                          name: swatch.name,
                          color: swatch.color,
                          selected: themeState.secondary.toARGB32() ==
                              swatch.color.toARGB32(),
                          onTap: () async {
                            hideKeyboard();
                            await ref
                                .read(appThemeProvider.notifier)
                                .setSecondary(swatch.color);
                            try {
                              await ref
                                  .read(webSettingsRepositoryProvider)
                                  .update(
                                    'admin_secondary_color',
                                    colorToHex(swatch.color),
                                  );
                            } catch (e) {
                              showErrorToast(
                                e is ApiException ? e.message : e.toString(),
                              );
                            }
                          },
                        ),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 48),
            Text(
              'Version ${AppConstants.appVersion}',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _ColorTile extends StatelessWidget {
  final String name;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _ColorTile({
    required this.name,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final onColor = AppTheme.onPrimaryOf(color);
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(AppConstants.radiusField),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppConstants.radiusField),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppConstants.radiusField),
            border: Border.all(
              color: selected ? Colors.white : Colors.black.withValues(alpha: 0.08),
              width: selected ? 2 : 1,
            ),
          ),
          child: Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: onColor,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }
}
