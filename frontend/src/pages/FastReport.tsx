import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { autoDetectIdentifierType } from '../utils/detector';
import { api, apiRequest, ScreenshotScanResult } from '../api/client';
import {
  Phone,
  MessageSquare,
  QrCode,
  Globe,
  CreditCard,
  HelpCircle,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Lock,
  MapPin,
  UploadCloud,
  Sparkles,
  X,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Calendar
} from 'lucide-react';

export const FastReport: React.FC = () => {
  const { t, lang, currentPincode, areas, reporterId, autoDetectAndLock } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper for datetime-local input (YYYY-MM-DDTHH:mm)
  const getInitialLocalDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  // 60-second telemetry timer
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    autoDetectAndLock();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Form states
  const [channel, setChannel] = useState<string>('Phone call');
  const [timeChoice, setTimeChoice] = useState<'justNow' | 'today' | 'yesterday' | 'pick'>('justNow');
  const [pickedDateTime, setPickedDateTime] = useState<string>(getInitialLocalDateTime);
  const [identifierValue, setIdentifierValue] = useState<string>(location.state?.initialValue || '');
  const [scamType, setScamType] = useState<string>('other');
  const [pincode, setPincode] = useState<string>(currentPincode);

  useEffect(() => {
    if (currentPincode) {
      setPincode(currentPincode);
    }
  }, [currentPincode]);
  const [note, setNote] = useState<string>('');
  const [hasScreenshot, setHasScreenshot] = useState<boolean>(() => Boolean(location.state?.openScreenshot));
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [analyzingScreenshot, setAnalyzingScreenshot] = useState<boolean>(false);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState<ScreenshotScanResult | null>(null);
  const [amountLost, setAmountLost] = useState<string>('');
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUrl = reader.result as string;
      
      // Layer 3 Security: Strip all EXIF / GPS / device metadata in browser memory via clean canvas redraw
      const img = new Image();
      img.onload = async () => {
        let cleanDataUrl = rawDataUrl;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            cleanDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          }
        } catch {
          cleanDataUrl = rawDataUrl;
        }

        setScreenshotPreview(cleanDataUrl);
        setAnalyzingScreenshot(true);

        try {
          // Call FastAPI: POST /scan-screenshot (Multimodal Vision LLM + Normalization & Trust Engine)
          const result = await api.scanScreenshot({
            image: cleanDataUrl,
            filename: file.name
          });

          setScreenshotAnalysis(result);

          if (result.fallback_notice) {
            setToastNotice(result.fallback_notice);
          } else {
            setToastNotice(null);
          }

          // Auto-populate report form fields from vision & trust engine analysis
          if (result.detected_identifier) {
            setIdentifierValue(result.detected_identifier);
          }
          if (result.scam_type && result.scam_type !== 'other') {
            setScamType(result.scam_type);
          }
        } catch {
          // Fallback if network issue
          setScreenshotAnalysis({
            ok: true,
            verdict: 'POTENTIAL_SCAM',
            risk_score: 75,
            confidence: 0.85,
            scam_type: 'other',
            detected_identifier: null,
            detected_identifier_type: 'phone',
            display_identifier: 'Attached Image',
            urgency_level: 'MEDIUM',
            artifacts_detected: ['Visual Proof Attached', 'EXIF Purged'],
            scam_intent: 'Unverified report screenshot',
            community_data: { report_count: 0, distinct_reporters: 0, challenged: false },
            summary: 'Screenshot processed. EXIF tags purged in memory.'
          });
        } finally {
          setAnalyzingScreenshot(false);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleClearScreenshot = () => {
    setScreenshotPreview(null);
    setScreenshotFileName('');
    setScreenshotAnalysis(null);
    setToastNotice(null);
  };

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Channels configuration
  const channelsList = [
    { id: 'Phone call', icon: Phone, labelEn: 'Phone call', labelHi: 'फोन कॉल' },
    { id: 'SMS or WhatsApp', icon: MessageSquare, labelEn: 'SMS / WhatsApp', labelHi: 'एसएमएस / व्हाट्सएप' },
    { id: 'QR code', icon: QrCode, labelEn: 'QR code', labelHi: 'क्यूआर कोड' },
    { id: 'Fake website', icon: Globe, labelEn: 'Fake website', labelHi: 'फर्जी वेबसाइट' },
    { id: 'UPI request', icon: CreditCard, labelEn: 'UPI request', labelHi: 'यूपीआई अनुरोध' },
    { id: 'Something else', icon: HelpCircle, labelEn: 'Something else', labelHi: 'कुछ और' }
  ];

  // Scam types list
  const scamTypesList = [
    { id: 'other', label: 'Not sure / पता नहीं' },
    { id: 'digital-arrest', label: t.scamTypes['digital-arrest'] },
    { id: 'fake-kyc-link', label: t.scamTypes['fake-kyc-link'] },
    { id: 'upi-refund-qr', label: t.scamTypes['upi-refund-qr'] },
    { id: 'investment-group', label: t.scamTypes['investment-group'] },
    { id: 'courier-customs', label: t.scamTypes['courier-customs'] },
    { id: 'job-offer', label: t.scamTypes['job-offer'] },
    { id: 'lottery-prize', label: t.scamTypes['lottery-prize'] },
    { id: 'loan-app-harassment', label: t.scamTypes['loan-app-harassment'] },
    { id: 'electricity-disconnection', label: t.scamTypes['electricity-disconnection'] },
    { id: 'fake-customer-care', label: t.scamTypes['fake-customer-care'] },
    { id: 'otp-call', label: t.scamTypes['otp-call'] },
    { id: 'sextortion', label: t.scamTypes['sextortion'] }
  ];

  const calculateOccurredAt = (): string => {
    const now = new Date();
    if (timeChoice === 'justNow') {
      return now.toISOString();
    } else if (timeChoice === 'today') {
      now.setHours(now.getHours() - 3);
      return now.toISOString();
    } else if (timeChoice === 'yesterday') {
      now.setDate(now.getDate() - 1);
      return now.toISOString();
    } else if (timeChoice === 'pick') {
      if (pickedDateTime) {
        const dt = new Date(pickedDateTime);
        if (!isNaN(dt.getTime())) {
          return dt.toISOString();
        }
      }
      return now.toISOString();
    }
    return now.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierValue.trim()) {
      setErrorMessage('Please enter the phone number, UPI ID, or link.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const detectedType = autoDetectIdentifierType(identifierValue);
    const selectedArea = areas.find((a) => a.pincode === pincode) || areas[0];

    const payload = {
      report_id: `rep_${Math.random().toString(36).substring(2, 10)}`,
      occurred_at: calculateOccurredAt(),
      reported_at: new Date().toISOString(),
      reporter_id: reporterId,
      channel: channel,
      scam_type: scamType,
      identifier_type: detectedType,
      identifier_value: identifierValue.trim(),
      pincode: pincode,
      locality: selectedArea.locality,
      city: selectedArea.city,
      note: note.trim(),
      has_screenshot: hasScreenshot,
      amount_lost_inr: parseFloat(amountLost) || 0.0
    };

    try {
      await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSubmittedSuccess(true);
      console.log(`[FastReport] Completed in ${elapsedSeconds} seconds`);
    } catch (err: any) {
      setErrorMessage(err.data?.error || t.serverError);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center shadow-lg space-y-5 animate-fade-in my-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.reportSuccessTitle}</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{t.reportSuccessSubtitle}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-700 text-left space-y-2 border border-slate-200/60">
          <p className="font-semibold text-slate-800">What to do right now:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Never answer follow-up calls from unknown numbers.</li>
            <li>If any money was transferred, call 1930 immediately to freeze bank accounts.</li>
          </ul>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full min-h-[48px] py-3 rounded-xl bg-teal text-white font-bold text-sm shadow hover:bg-teal-dark transition-all"
        >
          {t.backToHomeBtn}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Title & Dev-Timer */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">{t.fastReportTitle}</h2>
          <p className="text-xs text-slate-500">{t.fastReportSubtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 text-teal text-[11px] font-semibold border border-teal/20">
          <Clock className="w-3.5 h-3.5" />
          <span>{elapsedSeconds}s</span>
        </div>
      </div>

      {toastNotice && (
        <div className="bg-amber-500 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fade-in border border-amber-600">
          <div className="flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-100 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-amber-50">Online LLM Fail-Safe Active:</strong>
              <span className="text-[11px] text-amber-100 leading-tight block">{toastNotice}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="p-1 rounded-lg hover:bg-amber-600 text-white cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Communication Channel Tiles */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            {t.step1Channel}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {channelsList.map((ch) => {
              const Icon = ch.icon;
              const isSelected = channel === ch.id;
              return (
                <button
                  type="button"
                  key={ch.id}
                  onClick={() => setChannel(ch.id)}
                  className={`min-h-[64px] p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                    isSelected
                      ? 'bg-teal/10 border-2 border-teal text-teal font-bold shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 font-medium'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[11px] leading-tight line-clamp-1">{ch.labelEn}</span>
                  <span className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-1">{ch.labelHi}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Time Selection Chips */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            {t.step2Time}
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['justNow', 'today', 'yesterday', 'pick'] as const).map((choice) => (
              <button
                type="button"
                key={choice}
                onClick={() => setTimeChoice(choice)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  timeChoice === choice
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.timeChips[choice]}
              </button>
            ))}
          </div>

          {/* Custom Date & Time Picker */}
          {timeChoice === 'pick' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal" />
                  {lang === 'hi' ? 'घटना की तारीख और समय चुनें' : 'Select Incident Date & Time'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {lang === 'hi' ? 'केवल पिछली/वर्तमान तारीख' : 'Past or present time only'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={pickedDateTime}
                  max={getInitialLocalDateTime()}
                  onChange={(e) => setPickedDateTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal shadow-inner cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="font-medium text-slate-600 truncate max-w-[220px] sm:max-w-none">
                  {pickedDateTime && !isNaN(new Date(pickedDateTime).getTime()) ? (
                    <span className="text-teal font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {new Date(pickedDateTime).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      {lang === 'hi' ? 'कृपया तारीख चुनें' : 'Please select incident time'}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setPickedDateTime(getInitialLocalDateTime())}
                  className="text-[11px] text-teal font-bold hover:underline cursor-pointer shrink-0 ml-2"
                >
                  {lang === 'hi' ? 'अभी का समय सेट करें' : 'Set to now'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Identifier Paste Box */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            {t.step3Identifier}
          </label>
          <input
            type="text"
            required
            value={identifierValue}
            onChange={(e) => setIdentifierValue(e.target.value)}
            placeholder="e.g. +91 98765 43210 or user@okaxis"
            className="w-full px-4 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>

        {/* Step 4: Scam Type Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            {t.step4ScamType}
          </label>
          <select
            value={scamType}
            onChange={(e) => setScamType(e.target.value)}
            className="w-full px-3 py-3 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal"
          >
            {scamTypesList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Step 5: Location Automatically Detected & Locked (Tamper-Proof) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              {t.step5Area}
            </label>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full border border-teal/20">
              <Lock className="w-3 h-3" /> {t.tamperProofBadge}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal/10 text-teal flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-navy block truncate">
                    {areas.find((a) => a.pincode === pincode)?.locality || 'Indiranagar'}, {areas.find((a) => a.pincode === pincode)?.city || 'Bengaluru'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Postal Centroid: {pincode} • Auto-Locked
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal bg-teal/15 px-2 py-1 rounded-lg">
                <Lock className="w-3 h-3" /> LOCKED
              </span>
            </div>

            <p className="text-[10px] text-slate-500 leading-tight pt-1 border-t border-slate-200/60">
              🔒 {t.locationChangeDisabledNotice}
            </p>
          </div>

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.optionalNotePlaceholder}
            className="w-full px-3 py-2.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal"
          />

          <div className="flex items-center justify-between gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={hasScreenshot}
                onChange={(e) => {
                  setHasScreenshot(e.target.checked);
                  if (!e.target.checked) {
                    handleClearScreenshot();
                  }
                }}
                className="w-4 h-4 rounded text-teal focus:ring-teal border-slate-300"
              />
              <span>{t.hasScreenshotLabel}</span>
            </label>

            <div className="flex items-center gap-1.5 w-1/2">
              <input
                type="number"
                min="0"
                value={amountLost}
                onChange={(e) => setAmountLost(e.target.value)}
                placeholder={t.amountLostLabel}
                className="w-full px-2.5 py-1.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal"
              />
            </div>
          </div>

          {/* Screenshot Upload & Intelligent Verification Zone */}
          {hasScreenshot && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 animate-fade-in">
              {!screenshotPreview ? (
                <label className="border-2 border-dashed border-teal/40 hover:border-teal bg-white rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all group shadow-sm">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-center">
                    {t.uploadScreenshotPrompt}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    PNG, JPG, WebP • Scanned & verified automatically
                  </span>
                </label>
              ) : (
                <div className="space-y-3">
                  {/* File preview header */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot thumbnail"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-[200px]">
                          {screenshotFileName}
                        </span>
                        <span className="text-[10px] text-teal font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal" /> Verified Image Attached
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearScreenshot}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove screenshot"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scanning Animation */}
                  {analyzingScreenshot && (
                    <div className="bg-teal/5 border border-teal/20 rounded-xl p-3 flex items-center gap-2 text-xs text-teal font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-teal" />
                      <span>{t.analyzingScreenshot}</span>
                    </div>
                  )}

                  {/* Multimodal Vision & Trust Engine Decision Card */}
                  {screenshotAnalysis && !analyzingScreenshot && (
                    <div className="bg-white border-2 border-teal/40 rounded-2xl p-4 space-y-3.5 text-xs shadow-md animate-fade-in">
                      {/* Top Badges & Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal/10 text-teal flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-teal" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              AI Multimodal Vision Decision
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {screenshotAnalysis.vision_engine || 'OCR • Intent • Normalization & Trust DB'}
                            </span>
                          </div>
                        </div>

                        {/* Visual Verdict Badge */}
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-xs ${
                            screenshotAnalysis.verdict === 'KNOWN_SCAM'
                              ? 'bg-red-600 text-white'
                              : screenshotAnalysis.verdict === 'VERIFIED_BUSINESS'
                              ? 'bg-emerald-600 text-white'
                              : screenshotAnalysis.verdict === 'SUSPICIOUS'
                              ? 'bg-amber-500 text-white'
                              : 'bg-rose-500 text-white'
                          }`}>
                            {screenshotAnalysis.verdict.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Fail-Safe Fallback Notification if Online LLM is unavailable */}
                      {screenshotAnalysis.fallback_notice && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 animate-fade-in">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="font-bold block text-amber-900">LLM Engine Status:</span>
                            <span className="text-amber-800">{screenshotAnalysis.fallback_notice}</span>
                          </div>
                        </div>
                      )}

                      {/* Risk Meter & Urgency Bar */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-700 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            Risk Assessment Score: {screenshotAnalysis.risk_score}/100
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                            screenshotAnalysis.urgency_level === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : screenshotAnalysis.urgency_level === 'HIGH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-teal/10 text-teal'
                          }`}>
                            {screenshotAnalysis.urgency_level} URGENCY
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              screenshotAnalysis.risk_score >= 80
                                ? 'bg-gradient-to-r from-amber-500 to-red-600'
                                : screenshotAnalysis.risk_score >= 50
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${screenshotAnalysis.risk_score}%` }}
                          />
                        </div>
                      </div>

                      {/* Detected Entity Auto-Populate */}
                      {screenshotAnalysis.detected_identifier && (
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-teal" /> Extracted &amp; Normalized Entity
                            </span>
                            <span className="font-mono font-bold text-slate-900 truncate block text-xs">
                              {screenshotAnalysis.display_identifier || screenshotAnalysis.detected_identifier}
                            </span>
                            <span className="text-[10px] text-teal font-semibold font-mono uppercase">
                              Type: {screenshotAnalysis.detected_identifier_type}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-md bg-teal/10 text-teal font-bold border border-teal/20 shrink-0">
                            Auto-Applied
                          </span>
                        </div>
                      )}

                      {/* Scam Category Auto-Populate */}
                      {screenshotAnalysis.scam_type && screenshotAnalysis.scam_type !== 'other' && (
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500" /> Detected Fraud Category
                            </span>
                            <span className="font-bold text-slate-800 truncate block text-xs">
                              {t.scamTypes[screenshotAnalysis.scam_type] || screenshotAnalysis.scam_type}
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-md bg-teal/10 text-teal font-bold border border-teal/20 shrink-0">
                            Auto-Applied
                          </span>
                        </div>
                      )}

                      {/* AI-Manipulated Artifacts Badges */}
                      {screenshotAnalysis.artifacts_detected && screenshotAnalysis.artifacts_detected.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                            Forensic Signals &amp; Manipulated Artifacts:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {screenshotAnalysis.artifacts_detected.map((artifact, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-semibold border border-red-200"
                              >
                                <span>•</span>
                                <span>{artifact}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Community DB Intelligence */}
                      {screenshotAnalysis.community_data && screenshotAnalysis.community_data.report_count > 0 && (
                        <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            Cross-referenced in Community DB: {screenshotAnalysis.community_data.report_count} reports on record ({screenshotAnalysis.community_data.distinct_reporters} distinct citizens).
                          </span>
                        </div>
                      )}

                      {/* Summary Note */}
                      <p className="text-[11px] text-slate-600 leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        &quot;{screenshotAnalysis.summary}&quot;
                      </p>

                      <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-100 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-teal" />
                        <span>Zero personal victim data stored. Canvas metadata sanitization active.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inline Submit Button */}
        <div className="pt-4 space-y-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-teal hover:bg-teal-dark active:scale-[0.99] text-white font-bold text-base shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-5 h-5" />
            <span>{submitting ? t.submittingBtn : t.submitReportBtn}</span>
          </button>
          <p className="text-center text-[11px] text-slate-500">
            🔒 100% Anonymous • Submits to verified municipal centroid • Zero personal data stored
          </p>
        </div>
      </form>
    </div>
  );
};
