import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/app/constants.dart';
import 'package:yaazh_admin/core/format.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/coming_soon.dart';
import 'package:yaazh_admin/core/widgets/confirm_sheet.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/status_chip.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/features/testimonials/data/testimonial_repository.dart';
import 'package:yaazh_admin/features/testimonials/domain/testimonial.dart';

final testimonialSearchProvider = StateProvider<String>((ref) => '');

class TestimonialsPage extends ConsumerWidget {
  const TestimonialsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Testimonials'),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            hideKeyboard();
            context.push('/testimonials/new');
          },
          child: const Icon(Icons.add_rounded),
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                textInputAction: TextInputAction.search,
                onChanged: (value) =>
                    ref.read(testimonialSearchProvider.notifier).state = value,
                decoration: const InputDecoration(
                  hintText: 'Search name, review…',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
            ),
            const Expanded(child: _TestimonialList()),
          ],
        ),
      ),
    );
  }
}

class _TestimonialList extends ConsumerWidget {
  const _TestimonialList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(testimonialsProvider);
    final query = ref.watch(testimonialSearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: YaLoader()),
      error: (err, _) => EmptyState(
        title: 'Could not load testimonials',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((t) {
          if (query.isEmpty) return true;
          final hay = [
            t.customerName,
            t.customerPhone,
            t.review,
            t.approvalStatus,
          ].join(' ').toLowerCase();
          return hay.contains(query);
        }).toList();

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(testimonialsProvider);
            await ref.read(testimonialsProvider.future);
          },
          child: filtered.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      title: 'No testimonials',
                      subtitle: 'Approved reviews appear on the website.',
                      icon: Icons.star_outline_rounded,
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    return _TestimonialCard(item: filtered[index]);
                  },
                ),
        );
      },
    );
  }
}

class _TestimonialCard extends ConsumerWidget {
  final Testimonial item;

  const _TestimonialCard({required this.item});

  Future<void> _approve(WidgetRef ref) async {
    hideKeyboard();
    try {
      await ref.read(testimonialRepositoryProvider).approve(item.id);
      invalidateTestimonialCaches(ref, id: item.id);
      showSuccessToast('Testimonial approved');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _reject(BuildContext context, WidgetRef ref) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Reject testimonial?',
      message: 'This review will be hidden from the website.',
      actionLabel: 'Reject',
      icon: Icons.thumb_down_alt_outlined,
    );
    if (!ok) return;
    try {
      await ref.read(testimonialRepositoryProvider).reject(item.id);
      invalidateTestimonialCaches(ref, id: item.id);
      showSuccessToast('Testimonial rejected');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    hideKeyboard();
    final ok = await showConfirmSheet(
      context,
      title: 'Delete testimonial?',
      message: 'This review will be removed permanently.',
      actionLabel: 'Delete',
      icon: Icons.delete_outline_rounded,
    );
    if (!ok) return;
    try {
      await ref.read(testimonialRepositoryProvider).delete(item.id);
      invalidateTestimonialCaches(ref, id: item.id);
      showSuccessToast('Testimonial deleted');
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final t = item;
    final snippet = t.reviewSnippet?.isNotEmpty == true
        ? t.reviewSnippet!
        : t.review;
    final initial = t.customerName.isNotEmpty
        ? t.customerName[0].toUpperCase()
        : 'T';
    final approved = t.approvalStatus == 'approved';
    final rejected = t.approvalStatus == 'rejected';
    final radius = BorderRadius.circular(AppConstants.radiusS);

    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: BorderSide(color: theme.dividerColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/testimonials/${t.id}/edit'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.14),
                    child: Text(
                      initial,
                      style: TextStyle(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                titleCase(t.customerName),
                                style: theme.textTheme.titleSmall,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            StatusChip(
                              status: t.approvalStatus,
                              label: t.statusLabel,
                              tone: TestimonialMeta.color(t.approvalStatus),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            ...List.generate(5, (i) {
                              return Icon(
                                i < t.rating
                                    ? Icons.star_rounded
                                    : Icons.star_outline_rounded,
                                size: 16,
                                color: AppColors.warning,
                              );
                            }),
                            if (t.isFeatured) ...[
                              const SizedBox(width: 8),
                              Text(
                                'Featured',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.primary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          snippet,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          formatDateTime(t.createdAt),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: theme.dividerColor),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 2, 8, 2),
              child: Row(
                children: [
                  if (!approved && !rejected) ...[
                    TextButton(
                      onPressed: () => _approve(ref),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.success,
                        visualDensity: VisualDensity.compact,
                        textStyle: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      child: const Text('Approve'),
                    ),
                    TextButton(
                      onPressed: () => _reject(context, ref),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.warning,
                        visualDensity: VisualDensity.compact,
                        textStyle: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      child: const Text('Reject'),
                    ),
                  ],
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => _delete(context, ref),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.salmon,
                      visualDensity: VisualDensity.compact,
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    icon: const Icon(Icons.delete_outline_rounded, size: 18),
                    label: const Text('Delete'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
