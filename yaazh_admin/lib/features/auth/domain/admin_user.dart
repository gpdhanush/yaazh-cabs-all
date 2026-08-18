class AdminUser {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatarUrl;
  final String? roleId;
  final List<String>? permissions;

  const AdminUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatarUrl,
    this.roleId,
    this.permissions,
  });

  String get initials {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.length >= 2) {
      return (parts.first[0] + parts.last[0]).toUpperCase();
    }
    if (parts.length == 1) {
      final word = parts.first;
      if (word.length >= 2) return word.substring(0, 2).toUpperCase();
      return word[0].toUpperCase();
    }
    if (email.isNotEmpty) return email[0].toUpperCase();
    return 'A';
  }

  AdminUser copyWith({
    String? id,
    String? name,
    String? email,
    String? phone,
    String? avatarUrl,
    String? roleId,
    List<String>? permissions,
  }) {
    return AdminUser(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      roleId: roleId ?? this.roleId,
      permissions: permissions ?? this.permissions,
    );
  }

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    return AdminUser(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: _emptyToNull(json['phone']?.toString()),
      avatarUrl: _emptyToNull(json['avatar_url']?.toString()),
      roleId: json['role_id']?.toString(),
      permissions: _permissionsFrom(json),
    );
  }

  static List<String>? _permissionsFrom(dynamic raw) {
    if (raw == null) return null;
    if (raw is! List) return const [];
    return raw.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
  }

  static String? _emptyToNull(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty || trimmed == 'null') return null;
    return trimmed;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'avatar_url': avatarUrl,
        'role_id': roleId,
        'permissions': permissions,
      };
}
