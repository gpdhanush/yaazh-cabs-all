import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/settings/data/web_settings_repository.dart';
import 'package:yaazh_admin/features/settings/domain/app_setting.dart';

class WebSettingsPage extends ConsumerStatefulWidget {
  const WebSettingsPage({super.key});

  @override
  ConsumerState<WebSettingsPage> createState() => _WebSettingsPageState();
}

class _WebSettingsPageState extends ConsumerState<WebSettingsPage> {
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, String> _original = {};
  bool _saving = false;
  bool _hydrated = false;

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _hydrate(List<AppSetting> rows) {
    if (_hydrated) return;
    for (final row in rows) {
      _original[row.key] = row.value;
      _controllers[row.key] = TextEditingController(text: row.value)
        ..addListener(() => setState(() {}));
    }
    _hydrated = true;
  }

  List<String> get _dirtyKeys {
    return _controllers.entries
        .where((e) => e.value.text != (_original[e.key] ?? ''))
        .map((e) => e.key)
        .toList();
  }

  Future<void> _save() async {
    hideKeyboard();
    final dirty = _dirtyKeys;
    if (dirty.isEmpty) {
      showAppToast('No changes to save');
      return;
    }
    setState(() => _saving = true);
    try {
      final repo = ref.read(webSettingsRepositoryProvider);
      for (final key in dirty) {
        await repo.update(key, _controllers[key]!.text);
        _original[key] = _controllers[key]!.text;
      }
      invalidateWebSettings(ref);
      showSuccessToast('Settings saved');
      setState(() {});
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(webSettingsProvider);
    final dirtyCount = _dirtyKeys.length;

    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(title: const Text('Web settings')),
        body: async.when(
          loading: () => const Center(child: YaLoader()),
          error: (err, _) => EmptyState(
            title: 'Could not load settings',
            subtitle: err.toString(),
            icon: Icons.cloud_off_rounded,
          ),
          data: (rows) {
            _hydrate(rows);
            final groups = <String, List<AppSetting>>{};
            for (final row in rows) {
              groups.putIfAbsent(row.group, () => []).add(row);
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              children: [
                ...groups.entries.map((entry) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _GroupCard(
                      group: entry.key,
                      rows: entry.value,
                      controllers: _controllers,
                    ),
                  );
                }),
                ElevatedButton(
                  onPressed: _saving || dirtyCount == 0 ? null : _save,
                  child: Text(
                    dirtyCount == 0
                        ? 'SAVED'
                        : 'SAVE $dirtyCount CHANGE${dirtyCount == 1 ? '' : 'S'}',
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _GroupCard extends StatelessWidget {
  final String group;
  final List<AppSetting> rows;
  final Map<String, TextEditingController> controllers;

  const _GroupCard({
    required this.group,
    required this.rows,
    required this.controllers,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(AppSetting.groupIcon(group), color: theme.colorScheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(AppSetting.groupTitle(group), style: theme.textTheme.titleMedium),
                    Text(AppSetting.groupHint(group), style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...rows.map((row) {
            final controller = controllers[row.key];
            if (controller == null) return const SizedBox.shrink();
            final multiline = AppSetting.isMultiline(row.key);
            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: YaTextField(
                label: AppSetting.labelFor(row.key),
                controller: controller,
                minLines: multiline ? 2 : 1,
                maxLines: multiline ? 4 : 1,
                textInputAction:
                    multiline ? TextInputAction.newline : TextInputAction.next,
              ),
            );
          }),
        ],
      ),
    );
  }
}
