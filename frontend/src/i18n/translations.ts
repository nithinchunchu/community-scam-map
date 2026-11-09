export type Language = 'en' | 'hi';

export interface TranslationDictionary {
  appName: string;
  appTagline: string;
  helplineBanner: string;
  call1930: string;
  portalLink: string;
  languageName: string;
  
  // Navigation & Actions
  homeTab: string;
  reportTab: string;
  mapTab: string;
  alertsTab: string;
  disputeTab: string;
  privacyTab: string;
  adminTab: string;
  
  // Home
  searchPlaceholder: string;
  checkBtn: string;
  reportBtn: string;
  recentTrends: string;
  savedAreaAlertTitle: string;
  autoDetectType: {
    phone: string;
    upi: string;
    url: string;
    sender_id: string;
    unknown: string;
  };
  
  // Fast Report Flow
  fastReportTitle: string;
  fastReportSubtitle: string;
  devTimerBadge: string;
  step1Channel: string;
  step2Time: string;
  step3Identifier: string;
  step4ScamType: string;
  step5Area: string;
  optionalNotePlaceholder: string;
  hasScreenshotLabel: string;
  uploadScreenshotPrompt: string;
  analyzingScreenshot: string;
  screenshotAnalysisSuccess: string;
  detectedIdentifierLabel: string;
  detectedScamTypeLabel: string;
  applyToReportBtn: string;
  screenshotPrivacyNotice: string;
  amountLostLabel: string;
  submitReportBtn: string;
  submittingBtn: string;
  reportSuccessTitle: string;
  reportSuccessSubtitle: string;
  backToHomeBtn: string;
  
  // Time Chips
  timeChips: {
    justNow: string;
    today: string;
    yesterday: string;
    pick: string;
  };

  // Channels (Icon + Label)
  channels: {
    phone: string;
    smsWhatsapp: string;
    qrCode: string;
    fakeWebsite: string;
    upiRequest: string;
    somethingElse: string;
  };

  // Scam Types
  scamTypes: {
    [key: string]: string;
  };

  // Safety Advice per Scam Type
  safetyAdvice: {
    [key: string]: string;
  };

  // Verdicts
  verdicts: {
    knownScam: string;
    suspicious: string;
    noReports: string;
    verifiedBusiness: string;
  };
  
  // Result Screen Exact Wordings
  reportedByNearYou: string;
  reportedByTotal: string;
  noReportsWarning: string;
  firstSeen: string;
  lastSeen: string;
  evidenceTimeline: string;
  disputeButtonText: string;
  reportAgainButtonText: string;
  maskedExplanation: string;
  verifiedBadgeText: string;
  
  // Map Screen
  mapTitle: string;
  mapSubtitle: string;
  areaListHeader: string;
  reportsCount: string;
  severityCrit: string;
  severityHigh: string;
  severityMed: string;
  locationLockedBadge: string;
  locationLockedExplainer: string;
  locationLockedFilterAll: string;
  locationLockedFilterActive: string;
  allIndiaView: string;
  selectCityPrompt: string;
  cleanAreaStatus: string;
  searchMapPlaceholder: string;

  // Location Auto-Lock Security
  locationAutoLockedTitle: string;
  tamperProofBadge: string;
  locationChangeDisabledNotice: string;
  autoDetectedLocked: string;

  // Alerts Screen
  alertsTitle: string;
  spikeAlertBadge: string;
  newTypeAlertBadge: string;
  spikeDescription: string;
  newTypeDescription: string;
  noAlertsHeadline: string;
  noAlertsSub: string;

  // Dispute Screen
  disputeTitle: string;
  disputeSubtitle: string;
  claimantNameLabel: string;
  contactEmailLabel: string;
  proofNoteLabel: string;
  submitDisputeBtn: string;
  disputeSubmittedTitle: string;
  disputeSubmittedText: string;

  // Licence Expired Screen
  licenseExpiredTitle: string;
  licenseExpiredMessage: string;
  checkingLicenseStatus: string;

  // Offline / Error Messages
  offlineWarning: string;
  serverError: string;
  invalidInput: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    appName: "Community Scam Map",
    appTagline: "Neighborhood-Verified Fraud Intelligence",
    helplineBanner: "National Cyber Helpline: 1930",
    call1930: "Call 1930",
    portalLink: "cybercrime.gov.in",
    languageName: "English",

    homeTab: "Home",
    reportTab: "Report",
    mapTab: "Map",
    alertsTab: "Alerts",
    disputeTab: "Dispute",
    privacyTab: "Privacy",
    adminTab: "Admin",

    searchPlaceholder: "Paste number, UPI ID, link or SMS sender...",
    checkBtn: "Check Status",
    reportBtn: "Report Scam",
    recentTrends: "Neighborhood Scam Activity",
    savedAreaAlertTitle: "Alerts in your area",
    autoDetectType: {
      phone: "Phone Number",
      upi: "UPI Address",
      url: "Website Link",
      sender_id: "SMS Header",
      unknown: "Checking format..."
    },

    fastReportTitle: "Report a Scam",
    fastReportSubtitle: "Takes under 60 seconds • Zero login • 100% anonymous",
    devTimerBadge: "Report Timer",
    step1Channel: "1. How did they contact you?",
    step2Time: "2. When did it happen?",
    step3Identifier: "3. What number or link was used?",
    step4ScamType: "4. What kind of scam was it? (Optional)",
    step5Area: "5. Select your area",
    optionalNotePlaceholder: "One line about what they said (optional)...",
    hasScreenshotLabel: "I have a screenshot",
    uploadScreenshotPrompt: "Upload screenshot to verify & analyze (SMS, WhatsApp, QR, Call log)",
    analyzingScreenshot: "Scanning screenshot for scam phone numbers, UPI & patterns...",
    screenshotAnalysisSuccess: "Screenshot Verified & Analyzed",
    detectedIdentifierLabel: "Detected Identifier",
    detectedScamTypeLabel: "Detected Scam Pattern",
    applyToReportBtn: "Auto-Fill into Report",
    screenshotPrivacyNotice: "Client-side privacy: Screenshot is analyzed securely in your browser and never uploaded or stored on our servers.",
    amountLostLabel: "Money lost (₹, optional)",
    submitReportBtn: "Submit Report",
    submittingBtn: "Submitting anonymously...",
    reportSuccessTitle: "Report Logged Anonymously",
    reportSuccessSubtitle: "Your report helps protect people in your neighborhood.",
    backToHomeBtn: "Done / Back to Home",

    timeChips: {
      justNow: "Just now",
      today: "Today",
      yesterday: "Yesterday",
      pick: "Pick date"
    },

    channels: {
      phone: "Phone call",
      smsWhatsapp: "SMS / WhatsApp",
      qrCode: "QR code",
      fakeWebsite: "Fake website",
      upiRequest: "UPI request",
      somethingElse: "Something else"
    },

    scamTypes: {
      "digital-arrest": "Digital Arrest Video Call",
      "fake-kyc-link": "Fake Bank KYC Link",
      "upi-refund-qr": "UPI Refund QR Code",
      "investment-group": "Investment / WhatsApp Group",
      "courier-customs": "Customs Parcel Hold",
      "job-offer": "Work from Home / Task Job",
      "lottery-prize": "Lottery / Prize Fee",
      "loan-app-harassment": "Instant Loan Harassment",
      "electricity-disconnection": "Power Cut Alert SMS",
      "fake-customer-care": "Fake Customer Support",
      "otp-call": "OTP / Bank Verification Call",
      "sextortion": "Video Call Extortion",
      "other": "Other Scam Type"
    },

    safetyAdvice: {
      "digital-arrest": "Police and judicial agencies never conduct trials or demand bail over video calls. Hang up immediately.",
      "fake-kyc-link": "Banks never send APK files or shortened URLs to update your KYC. Visit your bank branch directly.",
      "upi-refund-qr": "Entering your UPI PIN always sends money, never receives it. Never scan a QR code to receive a refund.",
      "investment-group": "Guaranteed high returns on WhatsApp or Telegram groups are fraudulent schemes. Never deposit money.",
      "courier-customs": "Customs authorities do not demand clearance fines via personal UPI accounts. Do not pay.",
      "job-offer": "Legitimate companies never ask for registration fees or prepaid review tasks. Do not transfer funds.",
      "lottery-prize": "You cannot win a lottery you never entered. Never pay processing fees or taxes to receive a prize.",
      "loan-app-harassment": "Unauthorized instant loan apps trap borrowers and harass contacts. Report to cyber police immediately on 1930.",
      "electricity-disconnection": "Electricity boards never threaten disconnection via personal mobile numbers or personal UPI IDs.",
      "fake-customer-care": "Search engine ads often show fake helpline numbers. Use only the official bank app or card back.",
      "otp-call": "Never share OTP, card CVV, or passwords with anyone, even if they claim to be bank officials.",
      "sextortion": "Extortionists use recorded video calls to blackmail victims. Do not send money; file a report on 1930.",
      "other": "Do not transfer money or share personal OTPs. Verify all caller identities through official channels."
    },

    verdicts: {
      knownScam: "Known Scam",
      suspicious: "Suspicious",
      noReports: "No Reports",
      verifiedBusiness: "Verified Business"
    },

    reportedByNearYou: "Reported by {count} people near you",
    reportedByTotal: "Reported by {count} people",
    noReportsWarning: "No reports yet. This does not mean it is safe.",
    firstSeen: "First seen",
    lastSeen: "Last seen",
    evidenceTimeline: "Recent Incidents",
    disputeButtonText: "This is my business",
    reportAgainButtonText: "I experienced this too",
    maskedExplanation: "Number hidden until confirmed by 3 people near you.",
    verifiedBadgeText: "Verified Official Helpline or Business",

    mapTitle: "Neighborhood Scam Map",
    mapSubtitle: "Verified incidents across Indian communities over the past 7 days",
    areaListHeader: "Monitored Neighborhoods",
    reportsCount: "reports this week",
    severityCrit: "HIGH ALERT",
    severityHigh: "ELEVATED",
    severityMed: "MODERATE",
    locationLockedBadge: "Verified Neighborhood Zone",
    locationLockedExplainer: "Reports are mapped to verified neighborhood postal zones — protecting our community while keeping your exact location and identity 100% private.",
    locationLockedFilterAll: "All Monitored Areas",
    locationLockedFilterActive: "Active Incident Zones",
    allIndiaView: "All India View",
    selectCityPrompt: "Select City",
    cleanAreaStatus: "0 Reports • Peaceful Area",
    searchMapPlaceholder: "Search area, city or pincode (e.g. Bandra, HSR, 560038)...",

    locationAutoLockedTitle: "Neighborhood Protection Active",
    tamperProofBadge: "COMMUNITY VERIFIED • 100% PRIVATE",
    locationChangeDisabledNotice: "To protect the community from false reports, incidents are linked to your nearest municipal zone without tracking your personal GPS coordinates.",
    autoDetectedLocked: "Auto-Protected & Locked",

    alertsTitle: "Neighborhood Alerts",
    spikeAlertBadge: "SURGE ALERT",
    newTypeAlertBadge: "NEW SCAM TYPE",
    spikeDescription: "Reports in this area doubled today compared to the previous week.",
    newTypeDescription: "A new scam tactic was reported in this area in the last 24 hours.",
    noAlertsHeadline: "Neighborhood is Peaceful",
    noAlertsSub: "No unusual surges or new scam types reported in this area recently.",

    disputeTitle: "Business Dispute",
    disputeSubtitle: "Is this your official business number? File an official verification challenge.",
    claimantNameLabel: "Business / Owner Name",
    contactEmailLabel: "Official Contact Email",
    proofNoteLabel: "Proof details (GST number, shop licence, or official registry link)",
    submitDisputeBtn: "Submit Verification Challenge",
    disputeSubmittedTitle: "Challenge Submitted",
    disputeSubmittedText: "Your challenge is under review. The number is marked as under review and capped at suspicious.",

    licenseExpiredTitle: "Licence Expired",
    licenseExpiredMessage: "Licence expired. Contact your provider.",
    checkingLicenseStatus: "Auto-reconnecting when renewed (polling every 15s)...",

    offlineWarning: "You are offline. Showing cached information.",
    serverError: "Unable to reach server. Please try again.",
    invalidInput: "Please check the entered number or address."
  },

  hi: {
    appName: "कम्युनिटी स्कैम मैप",
    appTagline: "इलाके द्वारा सत्यापित फ्रॉड सूचना नेटवर्क",
    helplineBanner: "राष्ट्रीय साइबर हेल्पलाइन: 1930",
    call1930: "1930 पर कॉल करें",
    portalLink: "cybercrime.gov.in",
    languageName: "हिन्दी",

    homeTab: "होम",
    reportTab: "रिपोर्ट",
    mapTab: "नक्शा",
    alertsTab: "अलर्ट",
    disputeTab: "आपत्ति",
    privacyTab: "गोपनीयता",
    adminTab: "एडमिन",

    searchPlaceholder: "नंबर, यूपीआई आईडी या लिंक पेस्ट करें...",
    checkBtn: "स्थिति जांचें",
    reportBtn: "फ्रॉड रिपोर्ट करें",
    recentTrends: "आसपास की संदिग्ध गतिविधियां",
    savedAreaAlertTitle: "आपके क्षेत्र में सक्रिय अलर्ट",
    autoDetectType: {
      phone: "फोन नंबर",
      upi: "यूपीआई पता",
      url: "वेबसाइट लिंक",
      sender_id: "एसएमएस हेडर",
      unknown: "प्रारूप की जांच जारी..."
    },

    fastReportTitle: "फ्रॉड की शिकायत करें",
    fastReportSubtitle: "60 सेकंड से कम समय • बिना लॉगिन • 100% गोपनीय",
    devTimerBadge: "रिपोर्ट टाइमर",
    step1Channel: "1. आपसे कैसे संपर्क किया गया?",
    step2Time: "2. यह घटना कब हुई?",
    step3Identifier: "3. कौन सा नंबर या लिंक इस्तेमाल हुआ?",
    step4ScamType: "4. यह किस प्रकार का फ्रॉड था? (वैकल्पिक)",
    step5Area: "5. अपना क्षेत्र चुनें",
    optionalNotePlaceholder: "उन्होंने क्या कहा (वैकल्पिक एक पंक्ति)...",
    hasScreenshotLabel: "मेरे पास स्क्रीनशॉट है",
    uploadScreenshotPrompt: "सत्यापन और विश्लेषण के लिए स्क्रीनशॉट अपलोड करें (एसएमएस, व्हाट्सएप, क्यूआर, कॉल लॉग)",
    analyzingScreenshot: "स्क्रीनशॉट से नंबर, यूपीआई व फ्रॉड पैटर्न पहचाने जा रहे हैं...",
    screenshotAnalysisSuccess: "स्क्रीनशॉट सत्यापित और विश्लेषण पूरा",
    detectedIdentifierLabel: "पहचाना गया नंबर / यूपीआई",
    detectedScamTypeLabel: "पहचाना गया फ्रॉड पैटर्न",
    applyToReportBtn: "रिपोर्ट में स्वतः भरें",
    screenshotPrivacyNotice: "गोपनीयता सुरक्षा: स्क्रीनशॉट का विश्लेषण केवल आपके ब्राउज़र में होता है और इसे सर्वर पर कभी सेव नहीं किया जाता।",
    amountLostLabel: "गंवाए गए रुपये (₹, यदि कोई हो)",
    submitReportBtn: "रिपोर्ट दर्ज करें",
    submittingBtn: "गोपनीय रूप से दर्ज हो रहा है...",
    reportSuccessTitle: "रिपोर्ट सफलतापूर्वक दर्ज हुई",
    reportSuccessSubtitle: "आपकी सतर्कता से आपके आसपास के लोगों की सुरक्षा होगी।",
    backToHomeBtn: "संपन्न / होम पर जाएं",

    timeChips: {
      justNow: "अभी",
      today: "आज",
      yesterday: "कल",
      pick: "तारीख चुनें"
    },

    channels: {
      phone: "फोन कॉल",
      smsWhatsapp: "एसएमएस / व्हाट्सएप",
      qrCode: "क्यूआर कोड",
      fakeWebsite: "फर्जी वेबसाइट",
      upiRequest: "यूपीआई अनुरोध",
      somethingElse: "कुछ और"
    },

    scamTypes: {
      "digital-arrest": "डिजिटल अरेस्ट वीडियो कॉल",
      "fake-kyc-link": "फर्जी बैंक केवाईसी लिंक",
      "upi-refund-qr": "यूपीआई रिफंड क्यूआर कोड",
      "investment-group": "मुनाफे वाला व्हाट्सएप ग्रुप",
      "courier-customs": "पार्सल कस्टम्स जुर्माना",
      "job-offer": "घर बैठे नौकरी / टास्क जॉब",
      "lottery-prize": "लॉटरी / इनाम प्रोसेसिंग फीस",
      "loan-app-harassment": "इंस्टेंट लोन ऐप ब्लैकमेल",
      "electricity-disconnection": "बिजली कटने का एसएमएस",
      "fake-customer-care": "फर्जी कस्टमर केयर नंबर",
      "otp-call": "ओटीपी / बैंक वेरिफिकेशन कॉल",
      "sextortion": "वीडियो कॉल ब्लैकमेल",
      "other": "अन्य फ्रॉड"
    },

    safetyAdvice: {
      "digital-arrest": "पुलिस या अदालत कभी भी वीडियो कॉल पर पूछताछ या गिरफ्तारी नहीं करती। तुरंत कॉल काटें।",
      "fake-kyc-link": "बैंक कभी भी केवाईसी अपडेट के लिए एपीके फाइल या संदिग्ध लिंक नहीं भेजते। अपनी बैंक शाखा जाएं।",
      "upi-refund-qr": "यूपीआई पिन दर्ज करने से हमेशा पैसे कटते हैं, आते नहीं। रिफंड के लिए कभी क्यूआर कोड स्कैन न करें।",
      "investment-group": "व्हाट्सएप या टेलीग्राम ग्रुप पर भारी मुनाफे का दावा झूठा होता है। कभी भी अज्ञात खातों में पैसे न भेजें।",
      "courier-customs": "कस्टम्स अधिकारी पार्सल छुड़ाने के लिए यूपीआई पर जुर्माना नहीं मांगते। पैसे देने से इनकार करें।",
      "job-offer": "सच्ची कंपनियां नौकरी या टास्क के लिए पहले पैसे नहीं मांगतीं। कोई भी शुल्क न दें।",
      "lottery-prize": "जिस लॉटरी में भाग नहीं लिया, उसे जीत नहीं सकते। इनाम पाने के लिए कोई टैक्स या फीस न दें।",
      "loan-app-harassment": "अवैध लोन ऐप संपर्कों को धमकाते हैं। तुरंत 1930 पर शिकायत दर्ज करें।",
      "electricity-disconnection": "बिजली विभाग व्यक्तिगत नंबरों या यूपीआई आईडी से बिजली काटने की धमकी नहीं देता।",
      "fake-customer-care": "सर्च इंजन पर दिखने वाले हेल्पलाइन नंबर अक्सर फर्जी होते हैं। केवल आधिकारिक ऐप का उपयोग करें।",
      "otp-call": "बैंक अधिकारी बनकर फोन करने वाले को भी कभी अपना ओटीपी, सीवीवी या पासवर्ड न बताएं।",
      "sextortion": "ब्लैकमेल करने वालों को पैसे न भेजें; तुरंत 1930 पर संपर्क करें और साइबर सेल में शिकायत करें।",
      "other": "किसी भी अनजान व्यक्ति को पैसे न भेजें और न ही ओटीपी साझा करें। आधिकारिक माध्यमों से पुष्टि करें।"
    },

    verdicts: {
      knownScam: "ज्ञात फ्रॉड",
      suspicious: "संदिग्ध",
      noReports: "कोई रिपोर्ट नहीं",
      verifiedBusiness: "सत्यापित संस्थान"
    },

    reportedByNearYou: "आपके आसपास {count} लोगों द्वारा रिपोर्ट किया गया",
    reportedByTotal: "{count} लोगों द्वारा रिपोर्ट किया गया",
    noReportsWarning: "अभी कोई रिपोर्ट नहीं है। यह इसके सुरक्षित होने की गारंटी नहीं है।",
    firstSeen: "पहली बार देखा गया",
    lastSeen: "हालिया गतिविधि",
    evidenceTimeline: "हालिया घटनाएं",
    disputeButtonText: "यह मेरा व्यापार है",
    reportAgainButtonText: "मेरे साथ भी ऐसा हुआ",
    maskedExplanation: "आसपास के 3 लोगों द्वारा पुष्टि होने तक नंबर सुरक्षित रूप से छुपा रहता है।",
    verifiedBadgeText: "सत्यापित आधिकारिक हेल्पलाइन या संस्थान",

    mapTitle: "क्षेत्रीय घटना नक्शा",
    mapSubtitle: "पिछले 7 दिनों में विभिन्न क्षेत्रों से आई सत्यापित रिपोर्टें",
    areaListHeader: "निगरानी वाले इलाके",
    reportsCount: "रिपोर्ट इस सप्ताह",
    severityCrit: "उच्च चेतावनी",
    severityHigh: "बढ़ी हुई सक्रियता",
    severityMed: "मध्यम",
    locationLockedBadge: "सत्यापित क्षेत्रीय क्षेत्र",
    locationLockedExplainer: "रिपोर्टें सत्यापित क्षेत्रीय डाक क्षेत्रों से जुड़ी हैं — यह आपके सटीक स्थान और पहचान को 100% गोपनीय रखते हुए समुदाय की सुरक्षा करती हैं।",
    locationLockedFilterAll: "सभी निगरानी क्षेत्र",
    locationLockedFilterActive: "सक्रिय घटना क्षेत्र",
    allIndiaView: "पूरा भारत देखें",
    selectCityPrompt: "शहर चुनें",
    cleanAreaStatus: "0 रिपोर्ट • सुरक्षित व शांत क्षेत्र",
    searchMapPlaceholder: "क्षेत्र, शहर या पिनकोड खोजें (जैसे बांद्रा, एचएसआर, 560038)...",

    locationAutoLockedTitle: "सामुदायिक सुरक्षा सक्रिय",
    tamperProofBadge: "सामुदायिक रूप से सत्यापित • 100% सुरक्षित",
    locationChangeDisabledNotice: "फर्जी या भ्रामक रिपोर्टों को रोकने के लिए, आपका स्थान निकटतम नगर निगम क्षेत्र पर सुरक्षित किया जाता है, जिससे आपकी व्यक्तिगत गोपनीयता सुरक्षित रहती है।",
    autoDetectedLocked: "स्वतः सुरक्षित और लॉक",

    alertsTitle: "सामुदायिक चेतावनी",
    spikeAlertBadge: "अचानक वृद्धि",
    newTypeAlertBadge: "नया फ्रॉड तरीका",
    spikeDescription: "इस क्षेत्र में पिछले सप्ताह की तुलना में आज रिपोर्टों की संख्या दोगुनी हो गई है।",
    newTypeDescription: "इस क्षेत्र में पिछले 24 घंटों में एक नए प्रकार के फ्रॉड की सूचना मिली है।",
    noAlertsHeadline: "इलाका सुरक्षित है",
    noAlertsSub: "हाल ही में इस क्षेत्र में किसी असामान्य गतिविधि की सूचना नहीं मिली है।",

    disputeTitle: "व्यापारिक सत्यापन व आपत्ति",
    disputeSubtitle: "क्या यह आपका आधिकारिक व्यापारिक नंबर है? आधिकारिक सत्यापन के लिए आवेदन करें।",
    claimantNameLabel: "व्यापार या स्वामी का नाम",
    contactEmailLabel: "आधिकारिक संपर्क ईमेल",
    proofNoteLabel: "प्रमाण विवरण (जीएसटी नंबर, दुकान लाइसेंस या आधिकारिक सरकारी पंजीकरण)",
    submitDisputeBtn: "सत्यापन आवेदन जमा करें",
    disputeSubmittedTitle: "आवेदन प्राप्त हुआ",
    disputeSubmittedText: "आपकी आपत्ति समीक्षाधीन है। नंबर को जांच के अधीन चिह्नित कर दिया गया है।",

    licenseExpiredTitle: "लाइसेंस समाप्त",
    licenseExpiredMessage: "लाइसेंस समाप्त हो गया है। अपने प्रदाता से संपर्क करें।",
    checkingLicenseStatus: "नवीनीकरण की जांच जारी है (प्रत्येक 15 सेकंड में पुनः प्रयास)...",

    offlineWarning: "आप ऑफलाइन हैं। पहले से लोड की गई जानकारी दिखाई जा रही है।",
    serverError: "सर्वर से संपर्क नहीं हो पा रहा है। कृपया पुनः प्रयास करें।",
    invalidInput: "कृपया दर्ज किए गए नंबर या विवरण की जांच करें।"
  }
};
