class CustomerUser {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String? city;
  final String preferredLanguage;

  const CustomerUser({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.city,
    this.preferredLanguage = 'en',
  });

  factory CustomerUser.fromJson(Map<String, dynamic> json) {
    return CustomerUser(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      email: json['email']?.toString(),
      city: json['city']?.toString(),
      preferredLanguage: json['preferred_language']?.toString() ?? 'en',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'city': city,
      'preferred_language': preferredLanguage,
    };
  }

  CustomerUser copyWith({
    String? name,
    String? email,
    String? city,
    String? preferredLanguage,
  }) {
    return CustomerUser(
      id: id,
      name: name ?? this.name,
      phone: phone,
      email: email ?? this.email,
      city: city ?? this.city,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
    );
  }
}
