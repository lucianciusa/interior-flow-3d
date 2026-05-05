"use client";

import { useState } from "react";
import { CheckCircle2, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/stores/useLanguage";
import { marketingTranslations } from "@/lib/marketing-translations";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const { language } = useLanguage();
  const t = marketingTranslations[language].sections.waitlist;
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a delay to allow the closing animation to finish
    setTimeout(() => {
      setSubmitted(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-[480px] p-0 overflow-hidden border-none marketing-v2 shadow-2xl">
        <div className="bg-[var(--bg)] p-0 relative">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-soft)] rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none opacity-50" />
          
          <div className="p-8 relative z-10">
            {/* Manual close button */}
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-3)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors z-50"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {!submitted ? (
              <>
                <DialogHeader className="mb-8">
                  <div className="flex justify-between items-start">
                    <div className="section-tag mb-6">{t.tag}</div>
                  </div>
                  <DialogTitle className="text-4xl font-display tracking-tight text-[var(--ink)] leading-[1.1]">
                    {language === 'es' ? (
                      <>Únete a la <em className="not-italic bg-gradient-to-r from-[var(--accent)] to-[var(--warm)] bg-clip-text text-transparent">{t.titleEm}</em></>
                    ) : (
                      <>Join the <em className="not-italic bg-gradient-to-r from-[var(--accent)] to-[var(--warm)] bg-clip-text text-transparent">{t.titleEm}</em></>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-[var(--ink-2)] mt-4 text-lg leading-relaxed">
                    {t.lede}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="stack-8">
                    <label htmlFor="name" className="text-[11px] uppercase tracking-widest font-mono text-[var(--ink-3)] font-semibold">
                      {t.labelName}
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      placeholder="Jane Doe"
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg-2)] border border-[var(--line-2)] text-[var(--ink)] placeholder:text-[var(--ink-4)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] transition-all shadow-sm"
                    />
                  </div>
                  <div className="stack-8">
                    <label htmlFor="email" className="text-[11px] uppercase tracking-widest font-mono text-[var(--ink-3)] font-semibold">
                      {t.labelEmail}
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="jane@example.com"
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg-2)] border border-[var(--line-2)] text-[var(--ink)] placeholder:text-[var(--ink-4)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] transition-all shadow-sm"
                    />
                  </div>
                  <div className="stack-8">
                    <label htmlFor="role" className="text-[11px] uppercase tracking-widest font-mono text-[var(--ink-3)] font-semibold">
                      {t.labelInterest}
                    </label>
                    <div className="relative">
                      <select
                        id="role"
                        className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg-2)] border border-[var(--line-2)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] transition-all appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="individual">{t.interestIndividual}</option>
                        <option value="designer">{t.interestDesigner}</option>
                        <option value="agent">{t.interestAgent}</option>
                        <option value="other">{t.interestOther}</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ink-4)]">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full justify-center py-4.5 mt-4 text-base font-semibold group"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t.submitting}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {t.submit} <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </span>
                    )}
                  </button>
                  <p className="text-[11px] text-[var(--ink-3)] text-center mt-6 font-mono uppercase tracking-tighter opacity-70">
                    {t.privacy}
                  </p>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 rounded-3xl bg-[var(--sage)] flex items-center justify-center text-white mb-10 shadow-xl shadow-[var(--sage)]/20 rotate-3">
                  <CheckCircle2 size={48} strokeWidth={1.5} />
                </div>
                <h3 className="text-4xl font-display tracking-tight text-[var(--ink)] mb-4 leading-tight">
                  {t.successTitle}
                </h3>
                <p className="text-[var(--ink-2)] text-lg max-w-[320px] leading-relaxed mb-12">
                  {t.successLede}
                </p>
                <button
                  onClick={handleClose}
                  className="btn btn-ghost w-full py-4 text-base font-medium"
                >
                  {t.successCTA}
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

