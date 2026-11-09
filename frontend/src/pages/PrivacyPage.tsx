import React from 'react';
import { useApp } from '../context/AppContext';
import { Shield, EyeOff, MapPinOff, Lock, Hash, CheckCircle2, PhoneCall } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const { isHindi } = useApp();

  const safeguards = [
    {
      icon: <EyeOff className="w-5 h-5 text-trust-teal" />,
      titleEn: "Zero Personal Identity Stored",
      titleHi: "शून्य व्यक्तिगत पहचान संग्रहण",
      descEn: "No sign-up, phone login, or email required. Reporter identity is an anonymous local UUID kept solely on your device. We can never connect a report to your real identity.",
      descHi: "कोई साइन-अप, फोन लॉगिन या ईमेल की आवश्यकता नहीं है। रिपोर्टर की पहचान आपके डिवाइस पर रखी गई एक गोपनीय पहचान है। हम आपकी वास्तविक पहचान कभी नहीं जानते।"
    },
    {
      icon: <Hash className="w-5 h-5 text-trust-teal" />,
      titleEn: "One-Way Shingled Notes (No Plaintext)",
      titleHi: "नोट्स का केवल सुरक्षित हैश संग्रहण",
      descEn: "Raw incident descriptions are never saved to our database. Notes are instantly converted into irreversible 3-gram hashes purely to detect coordinated copy-paste bot attacks.",
      descHi: "आपकी घटना का विवरण कभी भी डेटाबेस में टेक्स्ट के रूप में नहीं रखा जाता। इसे तुरंत एकतरफा हैश में बदल दिया जाता है ताकि फर्जी बॉट हमलों को रोका जा सके।"
    },
    {
      icon: <Lock className="w-5 h-5 text-trust-teal" />,
      titleEn: "Privacy Masking (< 3 Reporters)",
      titleHi: "गोपनीयता सुरक्षा (3 से कम रिपोर्ट पर नंबर छुपाना)",
      descEn: "Phone numbers and identifiers are masked (e.g., 98XXXXX210) until at least 3 distinct neighbors independently report them. This prevents personal numbers from being targeted or defamed.",
      descHi: "फोन नंबर तब तक आंशिक रूप से छिपे रहते हैं जब तक कि आसपास के 3 अलग-अलग लोग स्वतंत्र रूप से उनकी रिपोर्ट न करें। इससे किसी निर्दोष व्यक्ति का नंबर बदनाम नहीं हो सकता।"
    },
    {
      icon: <MapPinOff className="w-5 h-5 text-trust-teal" />,
      titleEn: "No GPS or Exact Geolocation",
      titleHi: "कोई जीपीएस या सटीक लोकेशन नहीं",
      descEn: "We strictly forbid device GPS permissions. Users select from a predefined list of 27 verified municipal pincodes, protecting home coordinates and daily commute patterns.",
      descHi: "हम डिवाइस जीपीएस का कभी उपयोग नहीं करते। उपयोगकर्ता केवल मान्यता प्राप्त 27 पिनकोड में से चुनते हैं, जिससे आपका सटीक घर का पता हमेशा सुरक्षित रहता है।"
    },
    {
      icon: <Shield className="w-5 h-5 text-trust-teal" />,
      titleEn: "Subnet-Level IP Truncation",
      titleHi: "आईपी एड्रेस का गोपनीय रूपांतरण",
      descEn: "Incoming network IPs are automatically stripped to anonymous /24 subnets and one-way salted before trust evaluation. Access logs strictly drop query parameters and user identifiers.",
      descHi: "आईपी पते को तुरंत /24 सबनेट में बदल दिया जाता है और हैश किया जाता है। सर्वर एक्सेस लॉग में कोई भी व्यक्तिगत जानकारी या नंबर कभी दर्ज नहीं होते।"
    }
  ];

  return (
    <div className="max-w-md mx-auto space-y-5 pb-20">
      <div>
        <h1 className="text-xl font-bold text-trust-navy dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-trust-teal" />
          {isHindi ? "गोपनीयता और डेटा सुरक्षा वादे" : "Privacy & Data Architecture"}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isHindi
            ? "सामुदायिक विश्वास और नागरिक सुरक्षा को ध्यान में रखकर तैयार किया गया मंच"
            : "Engineered from the ground up to prevent doxxing, tracking, and false accusations."}
        </p>
      </div>

      <div className="space-y-3">
        {safeguards.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/70 shadow-sm space-y-1.5"
          >
            <div className="flex items-center gap-2">
              {item.icon}
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isHindi ? item.titleHi : item.titleEn}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-7">
              {isHindi ? item.descHi : item.descEn}
            </p>
          </div>
        ))}
      </div>

      {/* Official Helplines */}
      <div className="p-4 rounded-xl bg-trust-navy text-white space-y-3">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-trust-teal" />
          <h3 className="text-sm font-semibold">
            {isHindi ? "आधिकारिक सरकारी सहायता" : "Official Cybercrime Support"}
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isHindi
            ? "यदि आपने वित्तीय धोखाधड़ी में धन गंवाया है, तो तुरंत 1930 पर कॉल करें (राष्ट्रीय साइबर अपराध हेल्पलाइन) या cybercrime.gov.in पर शिकायत दर्ज करें।"
            : "If you have lost money to a financial scam, immediately dial 1930 (National Cybercrime Reporting Helpline) or file a complaint on cybercrime.gov.in."}
        </p>
        <div className="flex items-center gap-3 pt-1">
          <a
            href="tel:1930"
            className="px-3 py-2 rounded-lg bg-trust-teal hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            1930
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
          >
            cybercrime.gov.in
          </a>
        </div>
      </div>
    </div>
  );
};
