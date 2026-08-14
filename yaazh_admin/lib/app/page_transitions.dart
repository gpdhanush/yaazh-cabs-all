import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

CustomTransitionPage<void> appSlidePage({
  required GoRouterState state,
  required Widget child,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 280),
    reverseTransitionDuration: const Duration(milliseconds: 240),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final incoming = Tween<Offset>(
        begin: const Offset(1, 0),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      ));
      final outgoing = Tween<Offset>(
        begin: Offset.zero,
        end: const Offset(-1, 0),
      ).animate(CurvedAnimation(
        parent: secondaryAnimation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      ));
      return SlideTransition(
        position: outgoing,
        child: SlideTransition(
          position: incoming,
          child: child,
        ),
      );
    },
  );
}

GoRoute slideRoute({
  required String path,
  GlobalKey<NavigatorState>? parentNavigatorKey,
  required Widget Function(BuildContext context, GoRouterState state) builder,
}) {
  return GoRoute(
    path: path,
    parentNavigatorKey: parentNavigatorKey,
    pageBuilder: (context, state) => appSlidePage(
      state: state,
      child: builder(context, state),
    ),
  );
}
