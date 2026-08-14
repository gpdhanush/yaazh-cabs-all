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
import 'package:yaazh_admin/features/testimonials/data/testimonial_repository.dart';
import 'package:yaazh_admin/features/testimonials/domain/testimonial.dart';

final testimonialSearchProvider = StateProvider<String>((ref) => '');

class TestimonialsPage extends ConsumerWidget {
  const TestimonialsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 4,
      child: KeyboardDismiss(
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Testimonials'),
            bottom: const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'All'),
                Tab(text: 'Pending'),
                Tab(text: 'Approved'),
                Tab(text: 'Rejected'),
              ],
            ),
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
              const Expanded(
                child: TabBarView(
                  children: [
                    _TestimonialList(tab: _TestimonialTab.all),
                    _TestimonialList(tab: _TestimonialTab.pending),
                    _TestimonialList(tab: _TestimonialTab.approved),
                    _TestimonialList(tab: _TestimonialTab.rejected),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _TestimonialTab { all, pending, approved, rejected }

class _TestimonialList extends ConsumerWidget {
  final _TestimonialTab tab;

  const _TestimonialList({required this.tab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(testimonialsProvider);
    final query = ref.watch(testimonialSearchProvider).trim().toLowerCase();

    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => EmptyState(
        title: 'Could not load testimonials',
        subtitle: err.toString(),
        icon: Icons.cloud_off_rounded,
      ),
      data: (rows) {
        final filtered = rows.where((t) {
          final inTab = switch (tab) {
            _TestimonialTab.all => true,
            _TestimonialTab.pending => t.approvalStatus == 'pending',
            _TestimonialTab.approved => t.approvalStatus == 'approved',
            _TestimonialTab.rejected => t.approvalStatus == 'rejected',
          };
          if (!inTab) return false;
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

    return Material(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        side: BorderSide(color: theme.dividerColor),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppConstants.radiusL),
        onTap: () => context.push('/testimonials/${t.id}/edit'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      t.customerName,
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
              const SizedBox(height: 6),
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
              const SizedBox(height: 8),
              Text(
                snippet,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 8),
              Text(formatDateTime(t.createdAt), style: theme.textTheme.bodySmall),
              if (t.approvalStatus == 'pending') ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _approve(ref),
                        child: const Text('APPROVE'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _reject(context, ref),
                        child: const Text('REJECT'),
                      ),
                    ),
                  ],
                ),
              ],
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => _delete(context, ref),
                  child: const Text('Delete'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
