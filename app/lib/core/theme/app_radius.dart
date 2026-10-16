import 'package:flutter/material.dart';

/// Controlled border radius scale:
/// xs (4) / sm (6) / md (10) / lg (14) / xl (20) / full (999)
class AppRadius {
  static const double xsVal = 4.0;
  static const double smVal = 6.0;
  static const double mdVal = 10.0;
  static const double lgVal = 14.0;
  static const double xlVal = 20.0;
  static const double fullVal = 999.0;

  static const BorderRadius xs = BorderRadius.all(Radius.circular(xsVal));
  static const BorderRadius sm = BorderRadius.all(Radius.circular(smVal));
  static const BorderRadius md = BorderRadius.all(Radius.circular(mdVal));
  static const BorderRadius lg = BorderRadius.all(Radius.circular(lgVal));
  static const BorderRadius xl = BorderRadius.all(Radius.circular(xlVal));
  static const BorderRadius full = BorderRadius.all(Radius.circular(fullVal));

  static const BorderRadius topLg = BorderRadius.only(
    topLeft: Radius.circular(lgVal),
    topRight: Radius.circular(lgVal),
  );

  static const BorderRadius topXl = BorderRadius.only(
    topLeft: Radius.circular(xlVal),
    topRight: Radius.circular(xlVal),
  );
}
