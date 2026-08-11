class DriverUser {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String? address;
  final String? profileImageUrl;
  final String? licenseNo;
  final String? licenseExpiryDate;
  final String onlineStatus;
  final String availabilityStatus;
  final String verificationStatus;
  final double ratingAvg;
  final int totalCompletedTrips;
  final String? accessToken;
  final String? refreshToken;

  DriverUser({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.address,
    this.profileImageUrl,
    this.licenseNo,
    this.licenseExpiryDate,
    required this.onlineStatus,
    required this.availabilityStatus,
    required this.verificationStatus,
    required this.ratingAvg,
    this.totalCompletedTrips = 0,
    this.accessToken,
    this.refreshToken,
  });

  factory DriverUser.fromJson(Map<String, dynamic> json) {
    return DriverUser(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email']?.toString(),
      address: json['address']?.toString(),
      profileImageUrl: json['profile_image_url']?.toString(),
      licenseNo: json['license_no']?.toString(),
      licenseExpiryDate: json['license_expiry_date']?.toString(),
      onlineStatus: json['online_status'] ?? 'offline',
      availabilityStatus: json['availability_status'] ?? 'available',
      verificationStatus: json['verification_status'] ?? 'pending',
      ratingAvg: double.tryParse(json['rating_avg']?.toString() ?? '0') ?? 0.0,
      totalCompletedTrips:
          int.tryParse(json['total_completed_trips']?.toString() ?? '0') ?? 0,
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
      'address': address,
      'profile_image_url': profileImageUrl,
      'license_no': licenseNo,
      'license_expiry_date': licenseExpiryDate,
      'online_status': onlineStatus,
      'availability_status': availabilityStatus,
      'verification_status': verificationStatus,
      'rating_avg': ratingAvg,
      'total_completed_trips': totalCompletedTrips,
    };
  }

  DriverUser copyWith({
    String? name,
    String? phone,
    String? email,
    String? address,
    String? profileImageUrl,
    String? licenseNo,
    String? licenseExpiryDate,
    String? onlineStatus,
    String? availabilityStatus,
    String? verificationStatus,
    double? ratingAvg,
    int? totalCompletedTrips,
  }) {
    return DriverUser(
      id: id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      address: address ?? this.address,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      licenseNo: licenseNo ?? this.licenseNo,
      licenseExpiryDate: licenseExpiryDate ?? this.licenseExpiryDate,
      onlineStatus: onlineStatus ?? this.onlineStatus,
      availabilityStatus: availabilityStatus ?? this.availabilityStatus,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      ratingAvg: ratingAvg ?? this.ratingAvg,
      totalCompletedTrips: totalCompletedTrips ?? this.totalCompletedTrips,
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }
}
