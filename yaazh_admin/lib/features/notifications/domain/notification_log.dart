class NotificationLog {
  final String id;
  final String? title;
  final String body;
  final String channel;
  final String? deliveryStatus;
  final String recipientType;
  final String? recipientName;
  final String? recipientPhone;
  final String? audience;
  final String senderType;
  final String? createdAt;

  const NotificationLog({
    required this.id,
    this.title,
    required this.body,
    required this.channel,
    this.deliveryStatus,
    required this.recipientType,
    this.recipientName,
    this.recipientPhone,
    this.audience,
    required this.senderType,
    this.createdAt,
  });

  factory NotificationLog.fromJson(Map<String, dynamic> json) {
    return NotificationLog(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString(),
      body: json['body']?.toString() ?? '',
      channel: json['channel']?.toString() ?? '',
      deliveryStatus: json['delivery_status']?.toString(),
      recipientType: json['recipient_type']?.toString() ?? '',
      recipientName: json['recipient_name']?.toString(),
      recipientPhone: json['recipient_phone']?.toString(),
      audience: json['audience']?.toString(),
      senderType: json['sender_type']?.toString() ?? '',
      createdAt: json['created_at']?.toString(),
    );
  }
}
