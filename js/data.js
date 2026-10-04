/**
 * Initial Seed Data for Platform «مرحلة التأهيل»
 * Structured for direct migration to Cloud Firestore schemas in the future.
 */

export const INITIAL_MAHADEN = [
  { id: 'mahd_tasees_naseem', name: 'تأسيس النسيم', track: 'تأسيس', neighborhood: 'النسيم', color: 'blue' },
  { id: 'mahd_tasees_raghama', name: 'تأسيس الرغامة', track: 'تأسيس', neighborhood: 'الرغامة', color: 'indigo' },
  { id: 'mahd_takween_ajawid', name: 'تكوين الأجاويد', track: 'تكوين', neighborhood: 'الأجاويد', color: 'emerald' },
  { id: 'mahd_takween_raghama', name: 'تكوين الرغامة', track: 'تكوين', neighborhood: 'الرغامة', color: 'teal' },
  { id: 'mahd_tasees_tayseer', name: 'تأسيس التيسير', track: 'تأسيس', neighborhood: 'التيسير', color: 'cyan' },
  { id: 'mahd_takween_naseem', name: 'تكوين النسيم', track: 'تكوين', neighborhood: 'النسيم', color: 'amber' },
  { id: 'mahd_takween_tayseer', name: 'تكوين التيسير', track: 'تكوين', neighborhood: 'التيسير', color: 'purple' }
];

export const INITIAL_DATA = {
  mahaden: INITIAL_MAHADEN,

  users: [
    // 1. المشرف العام
    {
      id: 'O83e55HQuyajVh3Ji4FJltobyg63',
      name: 'الشيخ محمد الشواحي',
      email: 'admin@taaheel.sa',
      role: 'supervisor',
      avatar: 'الشيخ محمد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    // 2. مسؤول التحضير
    {
      id: 'TnCoR9ZTSibHTvIt15VPeQHfGFy1',
      name: 'مسؤول التحضير',
      email: 'attendance@taaheeltaskforce.com',
      role: 'attendance',
      avatar: 'التحضير',
      createdAt: '2026-09-01T08:00:00Z'
    },

    // ----------------------------------------------------
    // حسابات الطلاب (54 طالباً) موزعين على المحاضن الـ 7
    // ----------------------------------------------------

    // --- تكوين الأجاويد ---
    {
      id: '6F5JWlh28OeUdZTHT0JQXlNryll2',
      name: 'غسان اسماعيل ابراهيم شبير',
      email: '6F5JWlh28OeUdZTHT0JQXlNryll2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'غسان',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'X5Dc0d05f4WHZm6m4xLzJapGP352',
      name: 'وجدي عبدالله محمد معوضه',
      email: 'X5Dc0d05f4WHZm6m4xLzJapGP352@taaheeltaskforce.com',
      role: 'student',
      avatar: 'وجدي',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: '8IW99lJS8wSuClb24QS2tJgrHrp2',
      name: 'علي برناوي',
      email: '8IW99lJS8wSuClb24QS2tJgrHrp2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'علي',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'PHHhuh7tTLcQ6HdwbriDfvZ6jW63',
      name: 'حسن محمد الأشرم',
      email: 'PHHhuh7tTLcQ6HdwbriDfvZ6jW63@taaheeltaskforce.com',
      role: 'student',
      avatar: 'حسن',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'snpnOpFc9lXiYk8unz2I96RSn283',
      name: 'حسين خضر',
      email: 'snpnOpFc9lXiYk8unz2I96RSn283@taaheeltaskforce.com',
      role: 'student',
      avatar: 'حسين',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'sFtURW5zOSPu68halRL3u6IoZB03',
      name: 'أبو بكر موسى عيسى مالا',
      email: 'sFtURW5zOSPu68halRL3u6IoZB03@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أبو بكر',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'EbnDIOf5POhT0E3f6DwSDISNerA2',
      name: 'أحمد إبراهيم عبدالله القرني',
      email: 'EbnDIOf5POhT0E3f6DwSDISNerA2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أحمد',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'sdz7zvE4ftf3H8R3Xlm4SBPwwNE2',
      name: 'يوسف البسيسي',
      email: 'sdz7zvE4ftf3H8R3Xlm4SBPwwNE2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'يوسف',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'odhZaV2Uq9VxqHQbbxAq2ZS94Ls1',
      name: 'علي أبوبكر أبوبكر تيجاني',
      email: 'odhZaV2Uq9VxqHQbbxAq2ZS94Ls1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'علي',
      mahadId: 'mahd_takween_ajawid',
      mahadName: 'تكوين الأجاويد',
      createdAt: '2026-09-01T08:00:00Z'
    },

    // --- تأسيس التيسير ---
    {
      id: '8AsSUAb3UlaMWAWJaU5v1n3nuDH2',
      name: 'أحمد عادل باعارمة',
      email: '8AsSUAb3UlaMWAWJaU5v1n3nuDH2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أحمد',
      mahadId: 'mahd_tasees_tayseer',
      mahadName: 'تأسيس التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'QlGTx5Z37LNow03hoBtdKunYXrs2',
      name: 'خالد مبروك المولد',
      email: 'QlGTx5Z37LNow03hoBtdKunYXrs2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'خالد',
      mahadId: 'mahd_tasees_tayseer',
      mahadName: 'تأسيس التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'tNeebiHbNdPMJ1ORsZb2sdxurLI2',
      name: 'فارس النهاري',
      email: 'tNeebiHbNdPMJ1ORsZb2sdxurLI2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'فارس',
      mahadId: 'mahd_tasees_tayseer',
      mahadName: 'تأسيس التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'FVbwoQRRx5VVjF0Dc2tFrOdaLiA2',
      name: 'نواف محمد مجدلي',
      email: 'FVbwoQRRx5VVjF0Dc2tFrOdaLiA2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'نواف',
      mahadId: 'mahd_tasees_tayseer',
      mahadName: 'تأسيس التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'Ssw0cYU7oLSgJrGL2vZynm4r1rm2',
      name: 'ثامر محمد مجدلي',
      email: 'Ssw0cYU7oLSgJrGL2vZynm4r1rm2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'ثامر',
      mahadId: 'mahd_tasees_tayseer',
      mahadName: 'تأسيس التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'IkK9v65WAhMEesrDmgBfFgucQcW2',
      name: 'عبدالرحمن أحمد علي الزبيدي',
      email: 'IkK9v65WAhMEesrDmgBfFgucQcW2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'عبدالرحمن',
      mahadId: 'mahd_tasees_tayseer',
      mahadName: 'تأسيس التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },

    // --- تكوين التيسير ---
    {
      id: '67f8IU8ag0QL6I7ZtgJ0JIy4v2M2',
      name: 'سالم عبدالرحمن السباحي',
      email: '67f8IU8ag0QL6I7ZtgJ0JIy4v2M2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'سالم',
      mahadId: 'mahd_takween_tayseer',
      mahadName: 'تكوين التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'BxdmnHxCmTb93SrShyiUfKIL3ji2',
      name: 'عمر عبد العزيز علي',
      email: 'BxdmnHxCmTb93SrShyiUfKIL3ji2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'عمر',
      mahadId: 'mahd_takween_tayseer',
      mahadName: 'تكوين التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'wI0Aquza3LRwqtYPrgVKXg1npmU2',
      name: 'نايف سعيد باكوبن',
      email: 'wI0Aquza3LRwqtYPrgVKXg1npmU2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'نايف',
      mahadId: 'mahd_takween_tayseer',
      mahadName: 'تكوين التيسير',
      createdAt: '2026-09-01T08:00:00Z'
    },

    // --- تأسيس الرغامة ---
    {
      id: 'FD8dmiCpgmRI75dMB3tPi7uMqfi2',
      name: 'جبرين محمد حسن',
      email: 'FD8dmiCpgmRI75dMB3tPi7uMqfi2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'جبرين',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: '2H9UAgvW1iaTIi6ODp6Pz9skDZb2',
      name: 'نواف لطفي شماع',
      email: '2H9UAgvW1iaTIi6ODp6Pz9skDZb2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'نواف',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'EtuqpKp0cPMwgPOtmHqRsnnSqZy1',
      name: 'جبريل محمد عثمان',
      email: 'EtuqpKp0cPMwgPOtmHqRsnnSqZy1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'جبريل',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'm61ksX1NpWcvaSysVY1zQU3dvdh2',
      name: 'مهند أحمد الراجحي',
      email: 'm61ksX1NpWcvaSysVY1zQU3dvdh2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'مهند',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'wDriDENRMuZb0nTi6ubPn0n97Dt1',
      name: 'إياد محمد الحربي',
      email: 'wDriDENRMuZb0nTi6ubPn0n97Dt1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'إياد',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'bUW5DNBNtGe9oScxpNGXJtHJw9j1',
      name: 'موسى عبدالرحمن',
      email: 'bUW5DNBNtGe9oScxpNGXJtHJw9j1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'موسى',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'FtAhbeIIwAPIiR9DJsYdF2wAy1z1',
      name: 'نواف جعفر باطهف',
      email: 'FtAhbeIIwAPIiR9DJsYdF2wAy1z1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'نواف',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'QM3d0cTA00ert2pP7KwuOFfRlxx1',
      name: 'أنس محمد زنبع',
      email: 'QM3d0cTA00ert2pP7KwuOFfRlxx1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أنس',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'udizbwik0xSCjX34BeqYJSXHGyc2',
      name: 'فارس سكندر علي',
      email: 'udizbwik0xSCjX34BeqYJSXHGyc2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'فارس',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: '91yuoylr8nX2bOkwGkgRkjctfFl2',
      name: 'خليل إبراهيم جابر',
      email: '91yuoylr8nX2bOkwGkgRkjctfFl2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'خليل',
      mahadId: 'mahd_tasees_raghama',
      mahadName: 'تأسيس الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },

    // --- تكوين الرغامة ---
    {
      id: 'ttiFfyTsBEVCcoUVHbLcOgbTxvn1',
      name: 'الوليد خالد الزهراني',
      email: 'ttiFfyTsBEVCcoUVHbLcOgbTxvn1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'الوليد',
      mahadId: 'mahd_takween_raghama',
      mahadName: 'تكوين الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'ymLAqCZxlURErFyUBiYspVNKFQO2',
      name: 'عبداللطيف محمد',
      email: 'ymLAqCZxlURErFyUBiYspVNKFQO2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'عبداللطيف',
      mahadId: 'mahd_takween_raghama',
      mahadName: 'تكوين الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'OpMXwc9eLeb6lGffGWAgeAONpYF2',
      name: 'بلال غزوان زهراوي',
      email: 'OpMXwc9eLeb6lGffGWAgeAONpYF2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'بلال',
      mahadId: 'mahd_takween_raghama',
      mahadName: 'تكوين الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'MVvrW7lYVacAosUYkbDEucimIUj1',
      name: 'صالح محمد صالح بامهدي',
      email: 'MVvrW7lYVacAosUYkbDEucimIUj1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'صالح',
      mahadId: 'mahd_takween_raghama',
      mahadName: 'تكوين الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'aSMgCPhtbYTiEICssPwIXgkCAy23',
      name: 'أمجد محمد رباح الحربي',
      email: 'aSMgCPhtbYTiEICssPwIXgkCAy23@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أمجد',
      mahadId: 'mahd_takween_raghama',
      mahadName: 'تكوين الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'azp08zbe2eZvspsdrIryseDxV4y1',
      name: 'شريف مصطفى هارون',
      email: 'azp08zbe2eZvspsdrIryseDxV4y1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'شريف',
      mahadId: 'mahd_takween_raghama',
      mahadName: 'تكوين الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'OaLDTZMgHZa3Q6qj7L0U44OUV1v1',
      name: 'عبد الرحمن الزهراني',
      email: 'OaLDTZMgHZa3Q6qj7L0U44OUV1v1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'عبد الرحمن',
      mahadId: 'mahd_takween_raghama',
      mahadName: 'تكوين الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'ITMPyv2Qr7aUh3epkXD0zb7VDOH2',
      name: 'محمد بن هادي دردري',
      email: 'ITMPyv2Qr7aUh3epkXD0zb7VDOH2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'محمد',
      mahadId: 'mahd_takween_raghama',
      mahadName: 'تكوين الرغامة',
      createdAt: '2026-09-01T08:00:00Z'
    },

    // --- تأسيس النسيم ---
    {
      id: 'MWFmakMHrfYTR2FyDpHQujhMsge2',
      name: 'فيصل عطية الذبياني',
      email: 'MWFmakMHrfYTR2FyDpHQujhMsge2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'فيصل',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'lNvo1cqasUZA4oct1q3BMgR0B4I3',
      name: 'إبراهيم أنس فالته',
      email: 'lNvo1cqasUZA4oct1q3BMgR0B4I3@taaheeltaskforce.com',
      role: 'student',
      avatar: 'إبراهيم',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'wibSrTyllLhUGR5KFv5Ct9YFANN2',
      name: 'سعيد باعطيه',
      email: 'wibSrTyllLhUGR5KFv5Ct9YFANN2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'سعيد',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: '9lV2DtkzTxguTjRsNOGZuhWXxsN2',
      name: 'أمجد محمد باعباد',
      email: '9lV2DtkzTxguTjRsNOGZuhWXxsN2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أمجد',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: '954ciAdPgIZC9hHf9K3jYxJ0m2H2',
      name: 'أحمد فؤاد عبدالله',
      email: '954ciAdPgIZC9hHf9K3jYxJ0m2H2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أحمد',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'S0Lqc4MmuHMd5gSProK715WCIlK2',
      name: 'عبدالغني محمود الحربي',
      email: 'S0Lqc4MmuHMd5gSProK715WCIlK2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'عبدالغني',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'kbXFvAu8lqU7Dyx1RnFtpBktVmq1',
      name: 'محمد عبدالله سالم بن محفوظ',
      email: 'kbXFvAu8lqU7Dyx1RnFtpBktVmq1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'محمد',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'P7C4KPVTwtV16PBoflzvjhpBDks2',
      name: 'محمدعبدالفتاح نوح',
      email: 'P7C4KPVTwtV16PBoflzvjhpBDks2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'محمد',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'S6RfYhnG2ATsQ27gVgkGPH4oWg83',
      name: 'عبدالله الصبياني',
      email: 'S6RfYhnG2ATsQ27gVgkGPH4oWg83@taaheeltaskforce.com',
      role: 'student',
      avatar: 'عبدالله',
      mahadId: 'mahd_tasees_naseem',
      mahadName: 'تأسيس النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },

    // --- تكوين النسيم ---
    {
      id: 'nOAP6PV4qEZ3YA3lcKfvJhviXrA2',
      name: 'صالح محمد عثمان',
      email: 'nOAP6PV4qEZ3YA3lcKfvJhviXrA2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'صالح',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: '0zQHyDYbsVYs2pssQVXlnSvsPqE2',
      name: 'أمجد محمد يحيى حارثي',
      email: '0zQHyDYbsVYs2pssQVXlnSvsPqE2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أمجد',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'sUT40NeyyyWHwJzuJNY5ubDbv7i1',
      name: 'سياد عبدالكريم سياد',
      email: 'sUT40NeyyyWHwJzuJNY5ubDbv7i1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'سياد',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'StOwdFf48idvoduZET5ZUbkbMul2',
      name: 'أحمد خالد باكيلي',
      email: 'StOwdFf48idvoduZET5ZUbkbMul2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'أحمد',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'tpNwAC13RsZs3RB7hfBRefwzedH2',
      name: 'بسيل خالد باكيلي',
      email: 'tpNwAC13RsZs3RB7hfBRefwzedH2@taaheeltaskforce.com',
      aliases: ['bbrys005@gmail.com', 'bbrys005', 'basil', 'bassil'],
      role: 'student',
      avatar: 'بسيل',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'I96AqlQanVUeZP45xb6bHXGjFZi2',
      name: 'نزار حسان عزالدين',
      email: 'I96AqlQanVUeZP45xb6bHXGjFZi2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'نزار',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: '2il7BvfDzhebZOUxUG1og0pxlS53',
      name: 'عبدالرحمن باوزير',
      email: '2il7BvfDzhebZOUxUG1og0pxlS53@taaheeltaskforce.com',
      role: 'student',
      avatar: 'عبدالرحمن',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'LysyjhmEqVN1Q10ZLpEkUzfWXDQ2',
      name: 'مالك أنس الحاج',
      email: 'LysyjhmEqVN1Q10ZLpEkUzfWXDQ2@taaheeltaskforce.com',
      role: 'student',
      avatar: 'مالك',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    },
    {
      id: 'FkdJUvNYKGWkSI7kjYfR0iz7wTo1',
      name: 'محمد كمال محمد بارشيد',
      email: 'FkdJUvNYKGWkSI7kjYfR0iz7wTo1@taaheeltaskforce.com',
      role: 'student',
      avatar: 'محمد',
      mahadId: 'mahd_takween_naseem',
      mahadName: 'تكوين النسيم',
      createdAt: '2026-09-01T08:00:00Z'
    }
  ],

  assignments: [
    {
      id: 'asg_tafseer_hijr_israa',
      title: 'التفسير الميسر من سورة الحجر إلى الإسراء',
      description: 'مدارسة وتدبر تفسير الآيات الكريمة من سورة الحجر وسورة النحل إلى سورة الإسراء عبر التفسير الميسر.',
      sourceType: 'link',
      sourceUrl: '',
      startDate: '2026-09-01',
      endDate: '2026-11-30',
      points: 34,
      active: true,
      subtasks: [
        { id: 'sub_tafseer_1', title: 'تفسير سورة الحجر', points: 11 },
        { id: 'sub_tafseer_2', title: 'تفسير سورة النحل', points: 11 },
        { id: 'sub_tafseer_3', title: 'تفسير سورة الإسراء', points: 12 }
      ]
    },
    {
      id: 'asg_nawaqid_islam',
      title: 'حفظ متن نواقض الإسلام',
      description: 'حفظ وضبط متن نواقض الإسلام للإمام المجدد محمد بن عبدالوهاب رحمه الله وفهم معانيها العقدية.',
      sourceType: 'link',
      sourceUrl: '',
      startDate: '2026-09-01',
      endDate: '2026-11-15',
      points: 33,
      active: true,
      subtasks: [
        { id: 'sub_nawaqid_1', title: 'حفظ المقدمة والنواقض (الأول والثاني والثالث)', points: 11 },
        { id: 'sub_nawaqid_2', title: 'حفظ النواقض (الرابع والخامس والسادس)', points: 11 },
        { id: 'sub_nawaqid_3', title: 'حفظ النواقض (السابع إلى العاشر) والخاتمة', points: 11 }
      ]
    },
    {
      id: 'asg_qawaid_arbaa',
      title: 'حفظ متن القواعد الأربع',
      description: 'حفظ وإتقان متن القواعد الأربع في بيان حقيقة التوحيد والشرك وتطبيقاتها.',
      sourceType: 'link',
      sourceUrl: '',
      startDate: '2026-09-01',
      endDate: '2026-11-15',
      points: 33,
      active: true,
      subtasks: [
        { id: 'sub_qawaid_1', title: 'حفظ المقدمة والقاعدة الأولى', points: 8 },
        { id: 'sub_qawaid_2', title: 'حفظ القاعدة الثانية', points: 8 },
        { id: 'sub_qawaid_3', title: 'حفظ القاعدة الثالثة', points: 8 },
        { id: 'sub_qawaid_4', title: 'حفظ القاعدة الرابعة وخاتمة المتن', points: 9 }
      ]
    }
  ],

  progress: {},
  attendance: []
};
