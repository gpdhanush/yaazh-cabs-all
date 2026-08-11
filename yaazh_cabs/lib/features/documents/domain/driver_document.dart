class DriverDocument {
  final String id;
  final String documentType; // license, aadhaar, pan, rc, insurance, permit, fitness, etc.
  final String verificationStatus; // pending, verified, rejected, expired
  final String? fileUrl;
  final String? documentNo;
  final String? rejectionReason;
  final DateTime? expiryDate;

  DriverDocument({
    required this.id,
    required this.documentType,
    required this.verificationStatus,
    this.fileUrl,
    this.documentNo,
    this.rejectionReason,
    this.expiryDate,
  });

  factory DriverDocument.fromJson(Map<String, dynamic> json) {
    return DriverDocument(
      id: json['id']?.toString() ?? '',
      documentType: json['document_type'] ?? 'other',
      verificationStatus: json['verification_status'] ?? 'pending',
      fileUrl: json['file_url'],
      documentNo: json['document_no'],
      rejectionReason: json['rejection_reason']?.toString(),
      expiryDate: json['expiry_date'] != null ? DateTime.tryParse(json['expiry_date'].toString()) : null,
    );
  }
}
