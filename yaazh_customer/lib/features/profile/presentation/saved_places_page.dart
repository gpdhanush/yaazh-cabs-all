import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_customer/app/constants.dart';
import 'package:yaazh_customer/core/widgets/app_error_view.dart';
import 'package:yaazh_customer/core/widgets/app_loading_view.dart';
import 'package:yaazh_customer/core/widgets/app_state_pages.dart';
import 'package:yaazh_customer/features/profile/data/saved_places_repository.dart';

class SavedPlacesPage extends ConsumerWidget {
  const SavedPlacesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final places = ref.watch(savedPlacesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Saved places')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppConstants.accentColor,
        foregroundColor: Colors.black,
        onPressed: () => _addPlace(context, ref),
        child: const Icon(Icons.add_rounded),
      ),
      body: places.when(
        loading: () => const AppLoadingView(message: 'Loading places…'),
        error: (e, _) => AppErrorView(
          message: e.toString(),
          onRetry: () => ref.invalidate(savedPlacesProvider),
        ),
        data: (rows) {
          if (rows.isEmpty) {
            return AppEmptyView(
              icon: Icons.bookmark_border_rounded,
              title: 'No saved places',
              message: 'Save home, work, or frequent stops for faster booking.',
              actionLabel: 'Add a place',
              onAction: () => _addPlace(context, ref),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final place = rows[i];
              return ListTile(
                tileColor: Theme.of(context).cardColor,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: AppConstants.borderLight),
                ),
                leading: Icon(
                  place.label == 'home'
                      ? Icons.home_outlined
                      : place.label == 'work'
                          ? Icons.work_outline
                          : Icons.place_outlined,
                ),
                title: Text(place.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(place.address),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline_rounded),
                  onPressed: () async {
                    await ref.read(savedPlacesRepositoryProvider).delete(place.id);
                    ref.invalidate(savedPlacesProvider);
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}

Future<void> _addPlace(BuildContext context, WidgetRef ref) async {
  final title = TextEditingController();
  final address = TextEditingController();
  var label = 'other';
  final saved = await showDialog<bool>(
    context: context,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setState) {
          return AlertDialog(
            title: const Text('Save a place'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Wrap(
                  spacing: 8,
                  children: [
                    for (final option in const ['home', 'work', 'other'])
                      ChoiceChip(
                        label: Text(option[0].toUpperCase() + option.substring(1)),
                        selected: label == option,
                        selectedColor: AppConstants.accentColor,
                        onSelected: (_) => setState(() => label = option),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(controller: title, decoration: const InputDecoration(labelText: 'Title')),
                const SizedBox(height: 10),
                TextField(controller: address, decoration: const InputDecoration(labelText: 'Address')),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              TextButton(
                onPressed: () {
                  FocusManager.instance.primaryFocus?.unfocus();
                  Navigator.pop(ctx, true);
                },
                child: const Text('Save'),
              ),
            ],
          );
        },
      );
    },
  );
  if (saved != true) return;
  await ref.read(savedPlacesRepositoryProvider).create(
        title: title.text.trim().isEmpty ? 'Place' : title.text.trim(),
        address: address.text.trim().isEmpty ? title.text.trim() : address.text.trim(),
        label: label,
      );
  ref.invalidate(savedPlacesProvider);
}
