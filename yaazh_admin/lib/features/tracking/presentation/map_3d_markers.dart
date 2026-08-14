import 'dart:math' as math;

import 'package:flutter/material.dart';

class MapCar3d extends StatelessWidget {
  final double headingDeg;
  final bool selected;
  final VoidCallback? onTap;

  const MapCar3d({
    super.key,
    required this.headingDeg,
    this.selected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Transform.rotate(
        angle: headingDeg * math.pi / 180,
        child: CustomPaint(
          size: const Size(56, 56),
          painter: _CarPainter(selected: selected),
        ),
      ),
    );
  }
}

class MapCustomer3d extends StatelessWidget {
  const MapCustomer3d({super.key});

  @override
  Widget build(BuildContext context) {
    return const CustomPaint(
      size: Size(44, 56),
      painter: _PersonPainter(),
    );
  }
}

class MapDrop3d extends StatelessWidget {
  const MapDrop3d({super.key});

  @override
  Widget build(BuildContext context) {
    return const CustomPaint(
      size: Size(40, 52),
      painter: _PinPainter(),
    );
  }
}

class _CarPainter extends CustomPainter {
  final bool selected;

  _CarPainter({required this.selected});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2 + 4;
    final body = selected ? const Color(0xFF4B49AC) : const Color(0xFFF4C430);
    final roof = selected ? const Color(0xFF35348A) : const Color(0xFFE8B41A);
    final glass = const Color(0xFF93C5FD);

    final shadow = Paint()
      ..color = Colors.black.withValues(alpha: 0.22)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);
    canvas.drawOval(Rect.fromCenter(center: Offset(cx, cy + 14), width: 34, height: 12), shadow);

    void wheel(double x, double y) {
      canvas.drawOval(
        Rect.fromCenter(center: Offset(x, y), width: 10, height: 7),
        Paint()..color = const Color(0xFF1F2937),
      );
      canvas.drawOval(
        Rect.fromCenter(center: Offset(x, y), width: 5, height: 3.2),
        Paint()..color = const Color(0xFF9CA3AF),
      );
    }

    wheel(cx - 10, cy + 10);
    wheel(cx + 10, cy + 10);
    wheel(cx - 10, cy - 6);
    wheel(cx + 10, cy - 6);

    final chassis = Path()
      ..moveTo(cx - 11, cy + 11)
      ..lineTo(cx + 11, cy + 11)
      ..lineTo(cx + 13, cy + 2)
      ..lineTo(cx + 11, cy - 13)
      ..lineTo(cx - 11, cy - 13)
      ..lineTo(cx - 13, cy + 2)
      ..close();
    canvas.drawPath(chassis, Paint()..color = body);
    canvas.drawPath(
      chassis,
      Paint()
        ..color = Colors.white.withValues(alpha: 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );

    final cabin = Path()
      ..moveTo(cx - 8, cy + 2)
      ..lineTo(cx + 8, cy + 2)
      ..lineTo(cx + 7, cy - 8)
      ..lineTo(cx - 7, cy - 8)
      ..close();
    canvas.drawPath(cabin, Paint()..color = roof);

    final windshield = Path()
      ..moveTo(cx - 7, cy - 8)
      ..lineTo(cx + 7, cy - 8)
      ..lineTo(cx + 6, cy - 12)
      ..lineTo(cx - 6, cy - 12)
      ..close();
    canvas.drawPath(windshield, Paint()..color = glass);

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx - 8, cy - 13.5), width: 4, height: 2.4),
        const Radius.circular(1),
      ),
      Paint()..color = const Color(0xFFFDE68A),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx + 8, cy - 13.5), width: 4, height: 2.4),
        const Radius.circular(1),
      ),
      Paint()..color = const Color(0xFFFDE68A),
    );

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx - 8, cy + 11.5), width: 4, height: 2),
        const Radius.circular(1),
      ),
      Paint()..color = const Color(0xFFF87171),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx + 8, cy + 11.5), width: 4, height: 2),
        const Radius.circular(1),
      ),
      Paint()..color = const Color(0xFFF87171),
    );
  }

  @override
  bool shouldRepaint(covariant _CarPainter oldDelegate) => oldDelegate.selected != selected;
}

class _PersonPainter extends CustomPainter {
  const _PersonPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, size.height - 8), width: 22, height: 8),
      Paint()..color = Colors.black.withValues(alpha: 0.18),
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, size.height - 10), width: 18, height: 7),
      Paint()..color = const Color(0xFF22C55E),
    );
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, size.height - 11), width: 10, height: 3.5),
      Paint()..color = const Color(0xFF86EFAC),
    );

    final body = Path()
      ..moveTo(cx - 7, size.height - 16)
      ..quadraticBezierTo(cx, size.height - 34, cx + 7, size.height - 16)
      ..quadraticBezierTo(cx, size.height - 12, cx - 7, size.height - 16);
    canvas.drawPath(body, Paint()..color = const Color(0xFF1D4ED8));

    canvas.drawCircle(Offset(cx, 14), 7.5, Paint()..color = const Color(0xFFFBBF24));
    canvas.drawCircle(Offset(cx, 14), 5.8, Paint()..color = const Color(0xFFFDE68A));
    canvas.drawCircle(Offset(cx - 2, 13), 1.1, Paint()..color = const Color(0xFF1F2937));
    canvas.drawCircle(Offset(cx + 2, 13), 1.1, Paint()..color = const Color(0xFF1F2937));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _PinPainter extends CustomPainter {
  const _PinPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, size.height - 6), width: 16, height: 6),
      Paint()..color = Colors.black.withValues(alpha: 0.18),
    );

    final pin = Path()
      ..moveTo(cx, size.height - 8)
      ..quadraticBezierTo(cx - 16, 18, cx, 6)
      ..quadraticBezierTo(cx + 16, 18, cx, size.height - 8);
    canvas.drawPath(pin, Paint()..color = const Color(0xFFE53935));
    canvas.drawPath(
      pin,
      Paint()
        ..color = const Color(0xFFB91C1C)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    canvas.drawCircle(Offset(cx, 16), 6.5, Paint()..color = Colors.white);
    canvas.drawCircle(Offset(cx, 16), 3.4, Paint()..color = const Color(0xFFE53935));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
