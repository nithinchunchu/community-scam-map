import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { Building2, ShieldCheck, Mail, FileText, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const DisputePage: React.FC = () => {
  const { t } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [identifierType, setIdentifierType] = useState<string>(
    searchParams.get('type') || 'phone'
  );
  const [identifierValue, setIdentifierValue] = useState<string>(
    searchParams.get('value') || ''
  );
  const [claimantName, setClaimantName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierValue.trim()) {
      setErrorMsg('Please enter the phone number, UPI ID, or URL.');
      return;
    }
    if (!claimantName.trim()) {
      setErrorMsg('Please provide your business or organization name.');
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setErrorMsg('Please enter a valid official contact email.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Please provide verification details or registry info.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await api.createChallenge({
        identifier_type: identifierType,
        identifier_value: identifierValue.trim(),
        claimant_name: claimantName.trim(),
        contact_email: contactEmail.trim(),
        reason: reason.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit challenge. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.disputeSubmittedTitle}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed px-4">
            {t.disputeSubmittedText}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-left text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p><span className="font-semibold">Identifier:</span> {identifierValue}</p>
          <p><span className="font-semibold">Status:</span> Under Review (Capped at Suspicious)</p>
          <p><span className="font-semibold">Business:</span> {claimantName}</p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={() =>
              navigate(`/result?type=${encodeURIComponent(identifierType)}&value=${encodeURIComponent(identifierValue)}`)
            }
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-trust-navy hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-sm"
          >
            View Updated Lookup Status
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-medium text-sm transition-colors"
          >
            {t.backToHomeBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 pb-20">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-trust-navy dark:text-white">
            {t.disputeTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {t.disputeSubtitle}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identifier Type and Value */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Identifier to Contest
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={identifierType}
              onChange={(e) => setIdentifierType(e.target.value)}
              aria-label="Identifier Type"
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium outline-none min-h-[44px]"
            >
              <option value="phone">Phone Number</option>
              <option value="upi">UPI Address</option>
              <option value="url">Website Link</option>
              <option value="sender_id">SMS Header</option>
            </select>
            <input
              type="text"
              value={identifierValue}
              onChange={(e) => setIdentifierValue(e.target.value)}
              placeholder="e.g. 18001600 or shop@upi"
              required
              aria-label="Identifier Value"
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none min-h-[44px]"
            >
            </input>
          </div>
        </div>

        {/* Business details */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-trust-teal" />
              {t.claimantNameLabel}
            </label>
            <input
              type="text"
              value={claimantName}
              onChange={(e) => setClaimantName(e.target.value)}
              placeholder="e.g. Fresh Bakes Indiranagar"
              required
              aria-label={t.claimantNameLabel}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-trust-teal" />
              {t.contactEmailLabel}
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="owner@business.com"
              required
              aria-label={t.contactEmailLabel}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-trust-teal" />
              {t.proofNoteLabel}
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="GSTIN: 29XXXXX1234Z1, Shop Licence #45612, official domain link..."
              required
              aria-label={t.proofNoteLabel}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none min-h-[64px]"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            Under community safety rules, an active verification challenge instantly marks this identifier as under review, capping verdicts so it is never displayed as a Known Scam during adjudication.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-trust-navy hover:bg-slate-800 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? 'Submitting...' : t.submitDisputeBtn}
        </button>
      </form>
    </div>
  );
};
