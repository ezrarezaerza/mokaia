import type { MascotEvaluationInput, MascotStatus, MascotState, MascotPersonality, LanguageCode } from '../types';

export interface MascotPersonalityConfig {
  id: MascotPersonality;
  name: string;
  nameId: string;
  avatarEmoji: string;
  tagline: string;
  taglineId: string;
  tone: string;
  accentColor: string;
}

export const MASCOT_PERSONALITIES: MascotPersonalityConfig[] = [
  {
    id: 'zen',
    name: 'Zen Master',
    nameId: 'Master Zen',
    avatarEmoji: '🧘',
    tagline: 'Mindful, stoic, calming reflections',
    taglineId: 'Bijak, tenang, penuh kesadaran dan napas santai',
    tone: 'grounded and peaceful',
    accentColor: '#10b981',
  },
  {
    id: 'hype',
    name: 'Hype Coach',
    nameId: 'Pelatih Hype',
    avatarEmoji: '🔥',
    tagline: 'High-energy, relentless momentum & hype',
    taglineId: 'Enerjik, pantang menyerah, pembakar semangat',
    tone: 'enthusiastic and electrifying',
    accentColor: '#f97316',
  },
  {
    id: 'pragmatic',
    name: 'Pragmatic Penny',
    nameId: 'Analis Pragmatis',
    avatarEmoji: '📊',
    tagline: 'Cost-per-use math & tactical logic',
    taglineId: 'Hitungan logis, ROI biaya per pakai, anti-depresiasi',
    tone: 'sharp, data-backed and realistic',
    accentColor: '#3b82f6',
  },
  {
    id: 'cozy',
    name: 'Cozy Matcha',
    nameId: 'Teman Hangat',
    avatarEmoji: '🍵',
    tagline: 'Gentle warmth, guilt-free companionship',
    taglineId: 'Teman hangat tanpa penghakiman di hari yang melelahkan',
    tone: 'warm, supportive and non-judgmental',
    accentColor: '#a855f7',
  },
];

/**
 * Psychological Evaluation Engine for the Accountability Mascot with Personality & Language Modulation.
 */
export function evaluateMascotState(
  mascotName: string = 'Mochi',
  metrics: MascotEvaluationInput,
  personality: MascotPersonality = 'zen',
  language: LanguageCode = 'id'
): MascotStatus {
  const isId = language === 'id';
  const {
    currentStreak,
    graceDaysRemaining,
    coolingOffPendingCount,
    coolingOffRejectedCount,
    comfortFundRemaining,
    comfortFundAllowance,
    burnRatePercentage = 50,
  } = metrics;

  // 1. Check for Critical Warning / Concern First
  if (comfortFundRemaining <= 0 && comfortFundAllowance > 0) {
    if (personality === 'hype') {
      return {
        state: 'CONCERNED',
        title: isId ? 'Waktunya Jeda Comfort Fund!' : 'Comfort Fund Timeout!',
        bubbleText: isId
          ? `Tahan dulu, juara! Cadangan kenyamanan kita sudah habis! Kunci pertahanan sekarang, jangan ada belanja non-pokok hari ini!`
          : `Hold up, champion! Our comfort reserve hit zero! Time to lock in and defend the baseline. Zero non-essentials today!`,
        subText: isId ? 'Alokasi siklus ini habis. Ambil jeda 5 menit!' : 'Allowance depleted for this cycle. Take a 5-minute cooldown!',
        expressionEmoji: '🛑',
        badge: isId ? 'Pendinginan Aktif' : 'Cooldown Activated',
        themeColor: '#f43f5e',
      };
    }
    if (personality === 'pragmatic') {
      return {
        state: 'CONCERNED',
        title: isId ? 'Bantalan Keamanan Kosong' : 'Safety Buffer Depleted',
        bubbleText: isId
          ? `Comfort Fund sudah nol. Melanjutkan pengeluaran opsional sekarang langsung membebani rasio tabunganmu.`
          : `Comfort Fund is empty. Continuing discretionary spending now reduces your net emergency ratio.`,
        subText: isId ? 'Alokasi siklus ini habis. Evaluasi pos prioritas.' : 'Allowance depleted for this cycle. Review upcoming obligations.',
        expressionEmoji: '📉',
        badge: isId ? 'Batas Batas Mikro' : 'Micro-Budget Cap',
        themeColor: '#f43f5e',
      };
    }
    return {
      state: 'CONCERNED',
      title: isId ? 'Comfort Fund Menipis' : 'Comfort Fund Exhausted',
      bubbleText: isId
        ? `Hai kawan, ruang kenyamanan kita sudah kosong untuk siklus ini. Tarik napas pelan sebelum mengeluarkan uang hari ini ya.`
        : `Hey friend, our comfort sanctuary is empty for this cycle. Let's take a deep breath before spending on non-essentials today.`,
      subText: isId ? 'Alokasi siklus ini telah digunakan.' : 'Allowance depleted for this cycle. Need a moment to reset?',
      expressionEmoji: '🥺',
      badge: isId ? 'Perlu Jeda Santai' : 'Needs Gentle Rest',
      themeColor: '#f43f5e',
    };
  }

  if (coolingOffPendingCount >= 3) {
    if (personality === 'hype') {
      return {
        state: 'CONCERNED',
        title: isId ? 'Antrean Impuls Penuh!' : 'Impulse Queue Loaded!',
        bubbleText: isId
          ? `Ada ${coolingOffPendingCount} calon belanjaan tertahan di antrean! Jangan lengah, biarkan waktu yang membuktikan kebutuhan aslinya!`
          : `Boom! ${coolingOffPendingCount} potential purchases trapped in the holding pen! Don't let your guard down, wait out the clock!`,
        subText: isId ? `${coolingOffPendingCount} keinginan sedang dikunci.` : `${coolingOffPendingCount} impulses under lock & key.`,
        expressionEmoji: '🥊',
        badge: isId ? 'Menjaga Garis Pertahanan' : 'Holding the Line',
        themeColor: '#f59e0b',
      };
    }
    return {
      state: 'CONCERNED',
      title: isId ? 'Cooling-Off Queue Ramai' : 'Cooling-Off Queue Filling Up',
      bubbleText: isId
        ? `Wah, ada ${coolingOffPendingCount} barang impulsif yang sedang tertahan! Jeda 48 jam ini menjaga masa depanmu dari penyesalan.`
        : `Whoa, we have ${coolingOffPendingCount} impulse items on hold right now! The 48-hour timer is protecting your future self. Stay strong!`,
      subText: isId ? `${coolingOffPendingCount} barang dalam holding pen.` : `${coolingOffPendingCount} items locked in the holding pen.`,
      expressionEmoji: '🧐',
      badge: isId ? 'Antrean Sibuk' : 'Holding Pen Busy',
      themeColor: '#f59e0b',
    };
  }

  // 2. High Triumph / Proud State
  if (coolingOffRejectedCount >= 2) {
    if (personality === 'hype') {
      return {
        state: 'PROUD',
        title: isId ? 'Penghancur Godaan Impuls!' : 'Impulse Destroyer!',
        bubbleText: isId
          ? `DAHSYAT! Kamu berhasil menolak ${coolingOffRejectedCount} jebakan impulsif! Kekuatan niatmu menghasilkan kebebasan nyata!`
          : `BOOM! You shut down ${coolingOffRejectedCount} impulse traps! That's real willpower paying compound dividends right now!`,
        subText: isId ? `${coolingOffRejectedCount} godaan berhasil ditaklukkan!` : `${coolingOffRejectedCount} temptations defeated! Keep rolling!`,
        expressionEmoji: '⚡',
        badge: isId ? 'Disiplin Monster' : 'Willpower Beast',
        themeColor: '#10b981',
      };
    }
    if (personality === 'pragmatic') {
      return {
        state: 'PROUD',
        title: isId ? 'Efisiensi Menahan Diri' : 'High-Efficiency Restraint',
        bubbleText: isId
          ? `Menolak ${coolingOffRejectedCount} belanja impulsif menyelamatkan modal untuk impian jangka panjang dan mencegah pemborosan.`
          : `Walking away from ${coolingOffRejectedCount} impulses preserved capital for timeline goals and reduced lifestyle creep.`,
        subText: isId ? `${coolingOffRejectedCount} pembelian dicegah terdepresiasi.` : `${coolingOffRejectedCount} purchases prevented from depreciating.`,
        expressionEmoji: '💎',
        badge: isId ? 'Kemenangan Terukur' : 'Calculated Victory',
        themeColor: '#10b981',
      };
    }
    return {
      state: 'PROUD',
      title: isId ? 'Ahli Menolak Godaan Belanja!' : 'Impulse Resistance Master!',
      bubbleText: isId
        ? `Kamu sudah berhasil menolak ${coolingOffRejectedCount} godaan belanja! Uang itu masih utuh untuk impian besarmu. Bangga banget padamu!`
        : `You've walked away from ${coolingOffRejectedCount} impulse buys! That money is still working for your future dreams. I'm so proud of you!`,
      subText: isId ? `${coolingOffRejectedCount} pembelian sadar ditolak!` : `${coolingOffRejectedCount} purchases intentionally resisted!`,
      expressionEmoji: '✨',
      badge: isId ? 'Perisai Impuls Aktif' : 'Impulse Shield Active',
      themeColor: '#10b981',
    };
  }

  // 3. Cheering on Streaks
  if (currentStreak >= 5) {
    if (personality === 'hype') {
      return {
        state: 'CHEERING',
        title: isId ? `Streak ${currentStreak} Hari Membara!` : `${currentStreak}-Day Streak Inferno!`,
        bubbleText: isId
          ? `TIDAK TERHENTIKAN! ${currentStreak} hari berturut-turut! Disiplinmu luar biasa. Terus jaga api semangat ini sepanjang bulan!`
          : `UNSTOPPABLE! ${currentStreak} days straight! Your discipline is legendary right now. Let's keep this fire burning all month!`,
        subText: isId ? `${currentStreak} hari berjalan • ${graceDaysRemaining} grace shield siap` : `${currentStreak} days running • ${graceDaysRemaining} grace shields ready`,
        expressionEmoji: '🔥',
        badge: isId ? 'Membara Penuh' : 'On Pure Fire',
        themeColor: '#f97316',
      };
    }
    return {
      state: 'CHEERING',
      title: isId ? `Streak ${currentStreak} Hari Konsisten!` : `${currentStreak}-Day Streak Heatwave!`,
      bubbleText: isId
        ? `Konsistensi luar biasa! ${currentStreak} hari mencatat keuangan dengan sadar dan tenang! Otot kesadaran finansialmu makin kuat!`
        : `Incredible dedication! ${currentStreak} days of conscious, mindful money logging! Your financial mindfulness muscle is getting seriously strong!`,
      subText: isId ? `${currentStreak} hari berturut-turut • ${graceDaysRemaining} perisai aktif` : `${currentStreak} consecutive days logged • ${graceDaysRemaining} shields active`,
      expressionEmoji: '🔥',
      badge: isId ? 'Konsistensi Tinggi' : 'On Pure Fire',
      themeColor: '#f97316',
    };
  }

  if (currentStreak >= 1) {
    return {
      state: 'CHEERING',
      title: isId ? 'Momentum Sadar Finansial!' : 'Mindful Momentum!',
      bubbleText: isId
        ? `Setiap catatan transaksi adalah langkah menuju hidup penuh kesadaran. Kamu sedang membangun ketenangan keuangan, ${mascotName} setia mendampingimu!`
        : `Every transaction logged is a vote for intentional living. You're building lasting financial peace today, ${mascotName} is right beside you!`,
      subText: isId ? `Streak ${currentStreak} hari berlanjut. Pertahankan!` : `${currentStreak} day streak going strong. Keep it up!`,
      expressionEmoji: '😸',
      badge: isId ? 'Membangun Kebiasaan' : 'Building Momentum',
      themeColor: '#38bdf8',
    };
  }

  // 4. Default / Calm Mindful State
  return {
    state: 'NEUTRAL',
    title: isId ? 'Siap Menyambut Hari Ini' : 'Ready for Today',
    bubbleText: isId
      ? `Siap memeriksa tujuan keuangan kita? Catat transaksi harian atau singgahi Cooling-Off Queue saat godaan belanja muncul!`
      : `Ready to check in on our money goals? Log an expense or visit The Cooling-Off Queue whenever impulse strikes!`,
    subText: isId ? 'Kesadaran keuangan yang lembut, tanpa rasa bersalah.' : 'Gentle financial awareness, zero guilt.',
    expressionEmoji: '🌱',
    badge: isId ? 'Tenang & Fokus' : 'Zen & Focused',
    themeColor: '#a855f7',
  };
}

export interface MascotDialogueOption {
  id: string;
  label: string;
  icon: string;
  response: string;
  actionType?: 'BREATHE_EXERCISE' | 'COOLING_QUEUE' | 'COMFORT_RESET' | 'STATS_CHECK';
}

/**
 * Generate interactive conversation dialogues based on personality and user state in active language.
 */
export function getMascotDialogues(
  mascotName: string,
  personality: MascotPersonality = 'zen',
  metrics: MascotEvaluationInput,
  language: LanguageCode = 'id'
): MascotDialogueOption[] {
  const isId = language === 'id';
  const isHype = personality === 'hype';
  const isPragmatic = personality === 'pragmatic';

  if (isId) {
    return [
      {
        id: 'resist_urge',
        label: 'Bantu aku menahan godaan belanja sekarang',
        icon: '🛡️',
        response: isHype
          ? `BERHENTI DI SITU! Jangan biarkan dopamin sesaat merampas kebebasan masa depanmu! Tarik tiga napas dalam bersamaku dan kunci barang ini di Cooling-Off Queue. Kalau masih mau setelah 48 jam, kita bicarakan lagi!`
          : isPragmatic
          ? `Sebelum kamu klik bayar: Hitung Biaya Per Pakai (Cost-Per-Use). Bagi harga beli dengan berapa kali kamu benar-benar akan memakainya. Apakah itu sepadan dengan jam kerjamu? Mari jeda napas 3 kali.`
          : `Tarik napas dalam secara perlahan... lalu hembuskan. Keinginan yang kamu rasakan hanyalah gelombang sesaat. Kamu tidak wajib menuruti dorongan itu. Mari lakukan latihan jeda 3 napas bersama.`,
        actionType: 'BREATHE_EXERCISE',
      },
      {
        id: 'mindful_wisdom',
        label: 'Beri aku petuah bijak tentang uang',
        icon: '💡',
        response: isHype
          ? `Aturan #1 dalam permainan ini: Kamu tidak akan rugi atas apa yang tidak kamu belanjakan secara impulsif! Setiap rupiah yang kamu lindungi hari ini adalah tiket menuju kebebasan mutlak!`
          : isPragmatic
          ? `Bunga majemuk bekerja dua arah. Belanja impulsif hari ini bukan hanya memakan uang sekarang, tapi juga menghilangkan potensi pertumbuhan uang itu dalam 5 hingga 10 tahun ke depan.`
          : `Uang adalah energi dan perhatianmu. Saat kamu membelanjakannya dengan sadar, kamu menghargai waktu yang telah kamu korbankan. Nikmati kebutuhanmu, cicipi keinginanmu secukupnya, lindungi ketenangan batinmu.`,
      },
      {
        id: 'habit_check',
        label: 'Bagaimana catatan kebiasaanku sejauh ini?',
        icon: '📊',
        response: `Kamu sedang mempertahankan streak aktif ${metrics.currentStreak} hari dengan ${metrics.graceDaysRemaining} grace shield siap pakai. Kamu juga sudah berhasil menolak ${metrics.coolingOffRejectedCount} godaan impulsif! Pertahankan ritme ini!`,
        actionType: 'STATS_CHECK',
      },
      {
        id: 'comfort_reset',
        label: 'Hari ini cukup melelahkan dan membuat stres',
        icon: '🍵',
        response: isHype
          ? `Kita pasti bangkit! Hari berat adalah hal biasa bagi sang juara. Jangan luapkan stres ke belanja impulsif: jalan santai sebentar, dengarkan lagu favorit, dan gunakan Comfort Fund jika kamu butuh hadiah kecil!`
          : `Aku mengerti. Rasa bersalah finansial tidak akan menyembuhkan hari yang berat. Ingat: kamu punya Comfort Fund yang dirancang khusus untuk merawat diri tanpa merusak anggaran. Bersikaplah lembut pada dirimu hari ini.`,
        actionType: 'COMFORT_RESET',
      },
    ];
  }

  return [
    {
      id: 'resist_urge',
      label: 'Help me resist an urge right now',
      icon: '🛡️',
      response: isHype
        ? `PAUSE RIGHT THERE! Don't let quick dopamine rob your future! Take three deep breaths with me and lock it in the Cooling-Off Queue. If you still want it in 48 hours, we talk!`
        : isPragmatic
        ? `Before you tap pay: Calculate the Cost-Per-Use. Break the upfront cost down across every time you will actually use it. Is that worth the hours of your labor? Let's take a 3-breath pause.`
        : `Take a slow, deep breath in... and let it out. The urge you feel is just a passing wave. You don't have to obey it. Let's do a 3-breath mindful pause together.`,
      actionType: 'BREATHE_EXERCISE',
    },
    {
      id: 'mindful_wisdom',
      label: 'Give me a money wisdom drop',
      icon: '💡',
      response: isHype
        ? `Rule #1 of the game: You cannot lose what you do not spend on impulse! Every resource you protect today is another ticket to ultimate freedom!`
        : isPragmatic
        ? `Compound interest works both ways. Today's impulse buy doesn't just cost you the sticker price right now; it costs what that money could have compounded into over 10 years.`
        : `Money is energy and attention. When you spend mindfully, you honor the time you traded for it. Enjoy your needs, savor your wants, protect your peace.`,
    },
    {
      id: 'habit_check',
      label: 'How are my habits looking?',
      icon: '📊',
      response: `You are rocking a ${metrics.currentStreak}-day active streak with ${metrics.graceDaysRemaining} grace shields ready. You've walked away from ${metrics.coolingOffRejectedCount} impulses so far! Keep this cadence!`,
      actionType: 'STATS_CHECK',
    },
    {
      id: 'comfort_reset',
      label: 'I had a stressful day today',
      icon: '🍵',
      response: isHype
        ? `We bounce back! Bad days happen to the best players. Don't stress-spend: take a walk, blast your favorite playlist, and use the Comfort Fund if you really need a treat!`
        : `I hear you. Financial guilt doesn't fix a hard day. Remember: you have a Comfort Fund designed specifically for self-care without breaking the budget. Be kind to yourself today.`,
      actionType: 'COMFORT_RESET',
    },
  ];
}

export const DEFAULT_MASCOT_PRESETS = [
  { id: 'mochi_cat', name: 'Mochi', emoji: '🐱', label: 'Zen Kitten' },
  { id: 'boba_bear', name: 'Boba', emoji: '🐻', label: 'Calm Bear' },
  { id: 'pip_penguin', name: 'Pip', emoji: '🐧', label: 'Thrifty Penguin' },
  { id: 'kiwi_bird', name: 'Kiwi', emoji: '🥝', label: 'Little Sprout' },
  { id: 'spark_fox', name: 'Spark', emoji: '🦊', label: 'Clever Fox' },
];
