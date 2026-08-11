import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:yaazh_cabs/core/network/api_client.dart';
import 'package:yaazh_cabs/features/documents/domain/driver_document.dart';

final documentRepositoryProvider = Provider<DocumentRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DocumentRepository(apiClient);
});

class DocumentRepository {
  final ApiClient _apiClient;

  DocumentRepository(this._apiClient);

  Future<List<DriverDocument>> getDocuments() async {
    final response = await _apiClient.get('/driver/documents');
    if (response is List) {
      return response
          .map((item) => DriverDocument.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Upload local file to `POST /driver/uploads`, returns public `url`.
  Future<String> uploadFile(String filePath, {String? filename}) async {
    final response = await _apiClient.uploadFile(
      '/driver/uploads',
      filePath: filePath,
      filename: filename,
    );
    final map = response as Map<String, dynamic>;
    final url = map['url']?.toString() ?? map['path']?.toString();
    if (url == null || url.isEmpty) {
      throw Exception('Upload succeeded but no file URL was returned.');
    }
    return url;
  }

  Future<void> uploadDocument({
    required String documentType,
    required String fileUrl,
    String? documentNo,
    String? expiryDate,
  }) async {
    await _apiClient.post('/driver/documents', data: {
      'document_type': documentType,
      'file_url': fileUrl,
      if (documentNo != null) 'document_no': documentNo,
      if (expiryDate != null) 'expiry_date': expiryDate,
    });
  }
}
