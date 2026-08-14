import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:yaazh_admin/core/network/api_exception.dart';
import 'package:yaazh_admin/core/widgets/app_toast.dart';
import 'package:yaazh_admin/core/widgets/keyboard_dismiss.dart';
import 'package:yaazh_admin/core/widgets/ya_dropdown.dart';
import 'package:yaazh_admin/core/widgets/ya_field.dart';
import 'package:yaazh_admin/core/widgets/ya_loader.dart';
import 'package:yaazh_admin/core/widgets/ya_number_field.dart';
import 'package:yaazh_admin/features/testimonials/data/testimonial_repository.dart';

class TestimonialFormPage extends ConsumerStatefulWidget {
  final String? testimonialId;

  const TestimonialFormPage({super.key, this.testimonialId});

  bool get isEdit => testimonialId != null && testimonialId!.isNotEmpty;

  @override
  ConsumerState<TestimonialFormPage> createState() => _TestimonialFormPageState();
}

class _TestimonialFormPageState extends ConsumerState<TestimonialFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _review = TextEditingController();
  final _reply = TextEditingController();

  int _rating = 5;
  String _status = 'approved';
  bool _featured = false;
  bool _saving = false;
  bool _hydrated = false;

  @override
  void initState() {
    super.initState();
    if (widget.isEdit) {
      Future.microtask(_load);
    } else {
      _hydrated = true;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _review.dispose();
    _reply.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final t =
          await ref.read(testimonialRepositoryProvider).getById(widget.testimonialId!);
      if (!mounted) return;
      _name.text = t.customerName;
      _phone.text = t.customerPhone ?? '';
      _review.text = t.review;
      _reply.text = t.adminReply ?? '';
      _rating = t.rating.clamp(1, 5);
      _status = t.approvalStatus;
      _featured = t.isFeatured;
      setState(() => _hydrated = true);
    } catch (e) {
      if (!mounted) return;
      showErrorToast(e is ApiException ? e.message : e.toString());
      setState(() => _hydrated = true);
    }
  }

  Future<void> _save() async {
    hideKeyboard();
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final body = <String, dynamic>{
        'customer_name': _name.text.trim(),
        'customer_phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'review': _review.text.trim(),
        'rating': _rating,
        'approval_status': _status,
        'is_featured': _featured,
      };
      if (widget.isEdit) {
        body['admin_reply'] = _reply.text.trim().isEmpty ? null : _reply.text.trim();
        await ref
            .read(testimonialRepositoryProvider)
            .update(widget.testimonialId!, body);
      } else {
        await ref.read(testimonialRepositoryProvider).create(body);
      }
      invalidateTestimonialCaches(ref, id: widget.testimonialId);
      showSuccessToast(widget.isEdit ? 'Testimonial updated' : 'Testimonial created');
      if (mounted) context.pop();
    } catch (e) {
      showErrorToast(e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardDismiss(
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEdit ? 'Edit testimonial' : 'Add testimonial'),
        ),
        body: !_hydrated
            ? const Center(child: YaLoader())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                  children: [
                    YaTextField(
                      label: 'Customer',
                      required: true,
                      hint: 'Customer name',
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      validator: (v) =>
                          (v == null || v.trim().length < 2) ? 'Name is required' : null,
                    ),
                    const SizedBox(height: 14),
                    YaNumberField(
                      label: 'Phone',
                      hint: '10-digit phone',
                      controller: _phone,
                      maxLength: 10,
                    ),
                    const SizedBox(height: 14),
                    YaTextField(
                      label: 'Review',
                      required: true,
                      hint: 'Customer review text',
                      controller: _review,
                      minLines: 4,
                      maxLines: 8,
                      textInputAction: TextInputAction.newline,
                      validator: (v) =>
                          (v == null || v.trim().length < 2) ? 'Review is required' : null,
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<int>(
                      label: 'Rating',
                      value: _rating,
                      items: const [
                        DropdownMenuItem(value: 5, child: Text('5')),
                        DropdownMenuItem(value: 4, child: Text('4')),
                        DropdownMenuItem(value: 3, child: Text('3')),
                        DropdownMenuItem(value: 2, child: Text('2')),
                        DropdownMenuItem(value: 1, child: Text('1')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _rating = v);
                      },
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<String>(
                      label: 'Status',
                      value: _status,
                      items: const [
                        DropdownMenuItem(value: 'approved', child: Text('Approved')),
                        DropdownMenuItem(value: 'pending', child: Text('Pending')),
                        DropdownMenuItem(value: 'rejected', child: Text('Rejected')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _status = v);
                      },
                    ),
                    const SizedBox(height: 14),
                    YaDropdown<bool>(
                      label: 'Featured',
                      value: _featured,
                      items: const [
                        DropdownMenuItem(value: true, child: Text('Yes')),
                        DropdownMenuItem(value: false, child: Text('No')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _featured = v);
                      },
                    ),
                    if (widget.isEdit) ...[
                      const SizedBox(height: 14),
                      YaTextField(
                        label: 'Admin reply',
                        hint: 'Optional reply',
                        controller: _reply,
                        minLines: 3,
                        maxLines: 6,
                        textInputAction: TextInputAction.newline,
                      ),
                    ],
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: Text(widget.isEdit ? 'SAVE CHANGES' : 'CREATE TESTIMONIAL'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
