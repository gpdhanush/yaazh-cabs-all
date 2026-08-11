class DriverUser {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String onlineStatus; // offline, online, busy
  final String availabilityStatus; // available, on_trip, on_leave, suspended
  final String verificationStatus; // pending, approved, rejected, blocked
  final double ratingAvg;
  final String? accessToken;
  final String? refreshToken;

  DriverUser({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.onlineStatus,
    required this.availabilityStatus,
    required this.verificationStatus,
    required this.ratingAvg,
    this.accessToken,
    this.refreshToken,
  });

  factory DriverUser.fromJson(Map<String, dynamic> json) {
    return DriverUser(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'],
      onlineStatus: json['online_status'] ?? 'offline',
      availabilityStatus: json['availability_status'] ?? 'available',
      verificationStatus: json['verification_status'] ?? 'pending',
      ratingAvg: double.tryParse(json['rating_avg']?.toString() ?? '0') ?? 0.0,
      accessToken: json['access_token'],
      refreshToken: json['refresh_token'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'online_status': onlineStatus,
      'availability_status': availabilityStatus,
      'verification_status': verificationStatus,
      'rating_avg': ratingAvg,
    };
  }

  DriverUser copyWith({
    String? name,
    String? phone,
    String? email,
    String? onlineStatus,
    String? availabilityStatus,
    String? verificationStatus,
    double? ratingAvg,
  }) {
    return DriverUser(
      id: id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      onlineStatus: onlineStatus ?? this.onlineStatus,
      availabilityStatus: availabilityStatus ?? this.availabilityStatus,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      ratingAvg: ratingAvg ?? this.ratingAvg,
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }
}
