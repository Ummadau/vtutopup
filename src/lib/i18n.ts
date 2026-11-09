export type Language = 'en' | 'ha' | 'yo' | 'ig' | 'fr';

export interface Translations {
  welcomeBack: string;
  walletBalance: string;
  fundWallet: string;
  buyData: string;
  buyAirtime: string;
  electricity: string;
  cableTv: string;
  examPins: string;
  recentTransactions: string;
  viewAll: string;
  successful: string;
  pending: string;
  failed: string;
  all: string;
  transactions: string;
  savings: string;
  referralEarned: string;
  more: string;
  verified: string;
  superAdminConsole: string;
  language: string;
  refreshMetrics: string;
  authorizePayment: string;
  enterTransactionPin: string;
  confirmPin: string;
  incorrectPin: string;
  receipt: string;
  done: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    welcomeBack: 'Welcome back!',
    walletBalance: 'Wallet Balance',
    fundWallet: 'Fund Wallet',
    buyData: 'Buy Data',
    buyAirtime: 'Buy Airtime',
    electricity: 'Electricity',
    cableTv: 'Cable TV',
    examPins: 'Exam PINs',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View All',
    successful: 'Successful',
    pending: 'Pending',
    failed: 'Failed',
    all: 'All',
    transactions: 'Transactions',
    savings: 'Savings',
    referralEarned: 'Referral Earned',
    more: 'More',
    verified: 'Verified',
    superAdminConsole: 'Super Administrator Console',
    language: 'Language',
    refreshMetrics: 'Refresh All Metrics',
    authorizePayment: 'Authorize Payment',
    enterTransactionPin: 'Enter Transaction PIN',
    confirmPin: 'Confirm PIN',
    incorrectPin: 'Incorrect 4-digit transaction PIN',
    receipt: 'Transaction Receipt',
    done: 'Done',
  },
  ha: {
    welcomeBack: 'Barka da dawowa!',
    walletBalance: 'Ason Aljihu',
    fundWallet: 'Sanya Kudi',
    buyData: 'Sayen Data',
    buyAirtime: 'Sayen Katin Waya',
    electricity: 'Wutar Lantarki',
    cableTv: 'Katin TV',
    examPins: 'PIN din Jarrabawa',
    recentTransactions: 'Ayyukan Karshe',
    viewAll: 'Duba Duka',
    successful: 'An Kammala',
    pending: 'Yana Jiran Aiki',
    failed: 'Bai Yiwu Ba',
    all: 'Duk',
    transactions: 'Saye da Sayarwa',
    savings: 'Ragi da Aka Samu',
    referralEarned: 'Ladan Gayyata',
    more: 'Sauran Ayyuka',
    verified: 'An Tabbatar',
    superAdminConsole: 'Kwamfutar Gudanarwa',
    language: 'Harshe',
    refreshMetrics: 'Wanke Sabbin Bayanai',
    authorizePayment: 'Tabbatar da Biyan Kudi',
    enterTransactionPin: 'Shigar da PIN dinka',
    confirmPin: 'Tabbatar da PIN',
    incorrectPin: 'Kuskuren 4-digit transaction PIN',
    receipt: 'Rasit din Biyan Kudi',
    done: 'A Kammala',
  },
  yo: {
    welcomeBack: 'E kaabo!',
    walletBalance: 'Owo Inu Wallet',
    fundWallet: 'Fi Owo Sinu Wallet',
    buyData: 'Ra Data',
    buyAirtime: 'Ra Kati Waya',
    electricity: 'Ina Ijoba',
    cableTv: 'Kati TV',
    examPins: 'PIN Idanwo',
    recentTransactions: 'Awon Ise Owo Titun',
    viewAll: 'Wo Gbogbo Re',
    successful: 'Aseyori',
    pending: 'Pasi Lojukann',
    failed: 'Koto',
    all: 'Gbogbo',
    transactions: 'Awon Sise Owo',
    savings: 'Owo Ti O Fi Pamọ',
    referralEarned: 'Owo Inututu',
    more: 'Awon Eya Mii',
    verified: 'Ti Tabbatar',
    superAdminConsole: 'Gbongan Ogbon Admin',
    language: 'Ede',
    refreshMetrics: 'Tunte Bayanai',
    authorizePayment: 'Fohun Si Sisan Owo',
    enterTransactionPin: 'Sati 4-digit PIN Re',
    confirmPin: 'Gba PIN Sile',
    incorrectPin: 'Incorrect 4-digit transaction PIN',
    receipt: 'Rasiti Sisan Owo',
    done: 'O Tan',
  },
  ig: {
    welcomeBack: 'Nnoo!',
    walletBalance: 'Ego Inyefe Wallet',
    fundWallet: 'Tinye Ego',
    buyData: 'Gzuru Data',
    buyAirtime: 'Gzuru Airtime',
    electricity: 'Oku Leki',
    cableTv: 'Dekodah TV',
    examPins: 'PIN Ule',
    recentTransactions: 'Ihe Omuma Titun',
    viewAll: 'Hu Gbogbo Re',
    successful: 'Enwere Naso',
    pending: 'Na Eche',
    failed: 'O Nweghi Mma',
    all: 'Gbogbo',
    transactions: 'Ihe Emere',
    savings: 'Ego Echekwara',
    referralEarned: 'Ego Inyefe Nwanna',
    more: 'Ihe Ozo',
    verified: 'E Nwere Ike',
    superAdminConsole: 'Ulo Admin Supha',
    language: 'Asusu',
    refreshMetrics: 'Vuo Data Ha',
    authorizePayment: 'Kweenu Inyefe Ego',
    enterTransactionPin: 'Tinye PIN gi',
    confirmPin: 'Kwee PIN',
    incorrectPin: 'Incorrect 4-digit transaction PIN',
    receipt: 'Akwukwo Nkwado',
    done: 'Emechara',
  },
  fr: {
    welcomeBack: 'Bon retour!',
    walletBalance: 'Solde du Portefeuille',
    fundWallet: 'Recharger Portefeuille',
    buyData: 'Acheter Data',
    buyAirtime: 'Acheter Airtime',
    electricity: 'Électricité',
    cableTv: 'Télévision Câble',
    examPins: 'PINs d\'Examen',
    recentTransactions: 'Transactions Récents',
    viewAll: 'Voir Tout',
    successful: 'Réussi',
    pending: 'En Attente',
    failed: 'Échoué',
    all: 'Tous',
    transactions: 'Transactions',
    savings: 'Économies',
    referralEarned: 'Gains de Parrainage',
    more: 'Plus',
    verified: 'Vérifié',
    superAdminConsole: 'Console d\'Administration',
    language: 'Langue',
    refreshMetrics: 'Actualiser les Données',
    authorizePayment: 'Autoriser le Paiement',
    enterTransactionPin: 'Entrer PIN à 4 Chiffres',
    confirmPin: 'Confirmer PIN',
    incorrectPin: 'Code PIN à 4 chiffres incorrect',
    receipt: 'Reçu de Transaction',
    done: 'Terminé',
  },
};
