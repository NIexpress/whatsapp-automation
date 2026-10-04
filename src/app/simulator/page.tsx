"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Smartphone,
  Send,
  RotateCcw,
  CreditCard,
  Bot,
  User,
  Shield,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  Info,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface InteractiveOption {
  action: string;
  label: string;
  icon?: string;
}

function renderDecoratedWhatsAppText(content: string) {
  if (!content) return null;
  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        const tokens: React.ReactNode[] = [];
        let remaining = line;
        let tokenKey = 0;
        const formatRegex = /(https?:\/\/[^\s]+)|(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)|(`[^`]+`)/;

        while (remaining.length > 0) {
          const match = remaining.match(formatRegex);
          if (!match || match.index === undefined) {
            tokens.push(<span key={tokenKey++}>{remaining}</span>);
            break;
          }

          if (match.index > 0) {
            tokens.push(<span key={tokenKey++}>{remaining.slice(0, match.index)}</span>);
          }

          const matchedStr = match[0];
          if (match[1]) {
            tokens.push(
              <a
                key={tokenKey++}
                href={matchedStr}
                target="_blank"
                rel="noreferrer"
                className="text-[#53bdeb] hover:underline font-medium break-all"
              >
                {matchedStr}
              </a>
            );
          } else if (match[2]) {
            const text = matchedStr.slice(1, -1);
            tokens.push(
              <strong key={tokenKey++} className="font-bold text-white tracking-wide">
                {text}
              </strong>
            );
          } else if (match[3]) {
            const text = matchedStr.slice(1, -1);
            tokens.push(
              <em key={tokenKey++} className="italic text-slate-300 font-normal">
                {text}
              </em>
            );
          } else if (match[4]) {
            const text = matchedStr.slice(1, -1);
            tokens.push(
              <span key={tokenKey++} className="line-through text-slate-400">
                {text}
              </span>
            );
          } else if (match[5]) {
            const text = matchedStr.slice(1, -1);
            tokens.push(
              <code
                key={tokenKey++}
                className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-mono text-[11px] border border-slate-700/80 font-medium"
              >
                {text}
              </code>
            );
          }

          remaining = remaining.slice(match.index + matchedStr.length);
        }

        return (
          <p key={lineIdx} className="leading-relaxed">
            {tokens}
          </p>
        );
      })}
    </div>
  );
}

function cleanMessageContent(content: string, options: InteractiveOption[]): string {
  if (!content || options.length === 0) return content;

  const lines = content.split("\n");
  const filteredLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      filteredLines.push(rawLine);
      continue;
    }

    // Strip lines with numbered option prefixes like *1* or 1.
    if (/^\*(\d+)\*\s*/.test(line)) {
      continue;
    }

    // Check if line matches an extracted option
    const matchesOption = options.some((opt) => {
      const stripped = line.replace(/^[•\-\*]\s*/, "").replace(/\*/g, "").trim();
      const label = opt.label.replace(/\*/g, "").trim();
      return (
        stripped === label ||
        (opt.icon && stripped === `${opt.icon} ${label}`) ||
        stripped.startsWith(label) ||
        (opt.icon && stripped.startsWith(`${opt.icon} ${label.slice(0, 10)}`))
      );
    });

    if (matchesOption) {
      continue;
    }

    // Polish prompt line
    if (/Please (reply|select) with an option/i.test(line)) {
      if (/or type your query/i.test(line)) {
        filteredLines.push("Please select an option below or type your query:");
      } else {
        filteredLines.push("Please select an option below:");
      }
      continue;
    }

    filteredLines.push(rawLine);
  }

  const cleaned: string[] = [];
  let prevBlank = false;
  for (const l of filteredLines) {
    const isBlank = !l.trim();
    if (isBlank && prevBlank) continue;
    cleaned.push(l);
    prevBlank = isBlank;
  }

  while (cleaned.length > 0 && !cleaned[cleaned.length - 1].trim()) {
    cleaned.pop();
  }

  return cleaned.join("\n");
}

function extractInteractiveButtons(content: string): InteractiveOption[] {
  if (!content) return [];
  const options: InteractiveOption[] = [];
  const seenLabels = new Set<string>();

  const lines = content.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Pattern 1: *1* 📅 Book Day Care or *1* Some Label
    const p1 = line.match(/^\*(\d+)\*\s*(.+)$/);
    if (p1) {
      const rawText = p1[2].replace(/\*/g, "").trim();
      const emojiMatch = rawText.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\p{Emoji})\s*(.+)$/u);
      let icon: string | undefined;
      let label = rawText;
      if (emojiMatch) {
        icon = emojiMatch[1];
        label = emojiMatch[2].trim();
      }

      const key = label.toLowerCase();
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        options.push({ action: label, label, icon });
      }
      continue;
    }

    // Pattern 2: Emoji bullet options without serial numbers (e.g. 📅 Book Day Care, 💳 Pricing & Packages)
    const pEmoji = line.match(/^(?:[•\-\*]\s*)?([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\p{Emoji})\s*([A-Za-z0-9\s&'/()\-]{3,40})$/u);
    if (pEmoji) {
      const icon = pEmoji[1];
      const label = pEmoji[2].replace(/\*/g, "").trim();
      const lower = label.toLowerCase();
      const isHeader =
        lower.includes("welcome") ||
        (lower.includes("pricing") && line.length > 35) ||
        lower.includes("address") ||
        lower.endsWith(":");

      if (!isHeader && !seenLabels.has(lower)) {
        seenLabels.add(lower);
        options.push({ action: label, label, icon });
      }
      continue;
    }

    // Pattern 3: 1️⃣ *Single Day Visit:* ₹500 / day
    const p2 = line.match(/^([1-9]|10)️⃣\s*(.+)$/u);
    if (p2) {
      const action = p2[1];
      const label = p2[2].replace(/\*/g, "").trim();
      const key = label.toLowerCase();
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        options.push({ action: label, label, icon: `${action}️⃣` });
      }
      continue;
    }

    // Pattern 4: 1. *Rabies* (Mandatory)
    const p3 = line.match(/^(\d+)[\.\)]\s*(.+)$/);
    if (p3) {
      const action = p3[1];
      const label = p3[2].replace(/\*/g, "").trim();
      const key = label.toLowerCase();
      if (!seenLabels.has(key) && parseInt(action, 10) <= 6) {
        seenLabels.add(key);
        options.push({ action: label, label });
      }
      continue;
    }

    // Pattern 5: Reply *YES* to proceed
    const p4 = line.match(/Reply\s+\*([A-Za-z0-9_-]+)\*/i);
    if (p4) {
      const action = p4[1];
      const key = action.toLowerCase();
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        const isYes = action.toUpperCase() === "YES";
        options.push({
          action,
          label: isYes ? "Confirm & Proceed (YES)" : `Select "${action}"`,
          icon: isYes ? "✅" : "👉",
        });
      }
      continue;
    }

    // Pattern 6: Reply *1* to book now! or Reply *Book Day Care* to book now!
    const p5 = line.match(/Reply\s+\*([^\*]+)\*\s+to\s+([^\n!.]+)/i);
    if (p5) {
      const targetLabel = p5[2].trim();
      const key = targetLabel.toLowerCase();
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        options.push({
          action: targetLabel,
          label: targetLabel,
          icon: "🐾",
        });
      }
      continue;
    }

    // Pattern 7: Tap *Book Day Care* below
    const p6 = line.match(/Tap\s+\*([^\*]+)\*/i);
    if (p6) {
      const targetLabel = p6[1].trim();
      const key = targetLabel.toLowerCase();
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        options.push({
          action: targetLabel,
          label: targetLabel,
          icon: "🐾",
        });
      }
    }
  }

  return options;
}

function InChatBookingForm({
  onSubmit,
  isSubmitted,
}: {
  onSubmit: (details: {
    dogName: string;
    breed: string;
    date: string;
    packageType: string;
    timeSlot: string;
    notes?: string;
  }) => void;
  isSubmitted?: boolean;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = dayAfter.toISOString().slice(0, 10);

  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("Golden Retriever");
  const [isCustomBreed, setIsCustomBreed] = useState(false);
  const [date, setDate] = useState(tomorrowStr);
  const [pkg, setPkg] = useState("Single Day Visit (₹500)");
  const [notes, setNotes] = useState("");
  const [submittedLocal, setSubmittedLocal] = useState(false);

  const popularBreeds = [
    "Golden Retriever",
    "Labrador",
    "Beagle",
    "Indie / Mixed",
    "Shih Tzu",
    "German Shepherd",
  ];

  const packages = [
    { name: "Single Day Visit", price: "₹500", desc: "Full Day Care" },
    { name: "5-Day Care Package", price: "₹2,200", desc: "Save ₹300" },
    { name: "Monthly Unlimited", price: "₹7,500", desc: "30 Days Pass" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dogName.trim()) return;
    setSubmittedLocal(true);
    onSubmit({
      dogName: dogName.trim(),
      breed: breed.trim(),
      date,
      packageType: pkg,
      timeSlot: "09:00 AM – 06:00 PM",
      notes: notes.trim(),
    });
  };

  if (isSubmitted || submittedLocal) {
    return (
      <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl m-2.5 flex items-center gap-2.5 text-xs text-emerald-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <div>
          <div className="font-semibold text-emerald-300">Booking Form Submitted</div>
          <div className="text-[11px] text-emerald-400/80">
            Details sent in 1 single message • AI has generated your payment link below
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-[#111b21] border-t border-[#2a3942] space-y-3 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#2a3942]/60">
        <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Needin Quick Booking Form</span>
        </div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
          ⚡ 1-Step Form
        </span>
      </div>

      {/* Dog Name Input */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
          🐾 Dog&apos;s Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={dogName}
          onChange={(e) => setDogName(e.target.value)}
          placeholder="e.g. Bruno, Max, Bella"
          className="w-full bg-[#202c33] border border-[#2a3942] focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
        />
      </div>

      {/* Breed Quick Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
          🐕 Breed <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {popularBreeds.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                setBreed(b);
                setIsCustomBreed(false);
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                !isCustomBreed && breed === b
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "bg-[#202c33] text-slate-300 hover:bg-[#2a3942] border border-[#2a3942]"
              }`}
            >
              {b}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCustomBreed(true)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
              isCustomBreed
                ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                : "bg-[#202c33] text-slate-300 hover:bg-[#2a3942] border border-[#2a3942]"
            }`}
          >
            Custom...
          </button>
        </div>
        {isCustomBreed && (
          <input
            type="text"
            required
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="Type your dog's breed..."
            className="w-full bg-[#202c33] border border-[#2a3942] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
          />
        )}
      </div>

      {/* Visit Date Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
          📅 Visit Date <span className="text-red-400">*</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[#202c33] border border-[#2a3942] focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none flex-1 [color-scheme:dark]"
          />
          <button
            type="button"
            onClick={() => setDate(tomorrowStr)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
              date === tomorrowStr
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-[#202c33] border-[#2a3942] text-slate-400 hover:text-slate-200"
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => setDate(dayAfterStr)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
              date === dayAfterStr
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-[#202c33] border-[#2a3942] text-slate-400 hover:text-slate-200"
            }`}
          >
            +2 Days
          </button>
        </div>
      </div>

      {/* Package Options */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
          📦 Package
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {packages.map((p) => {
            const isSelected = pkg.startsWith(p.name);
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => setPkg(`${p.name} (${p.price})`)}
                className={`p-2 rounded-lg text-left transition cursor-pointer border ${
                  isSelected
                    ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/30"
                    : "bg-[#202c33] border-[#2a3942] text-slate-300 hover:bg-[#2a3942]"
                }`}
              >
                <div className="font-semibold text-[10px] truncate">{p.name}</div>
                <div className="text-[11px] font-bold text-emerald-400 mt-0.5">{p.price}</div>
                <div className="text-[9px] text-slate-400 truncate">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Operating Hours Notice */}
      <div className="p-2 rounded-lg bg-[#202c33]/70 border border-[#2a3942]/50 text-[10px] text-slate-400 flex items-center justify-between">
        <span>⏰ Drop-off: 08:00–11:00 AM</span>
        <span>Pick-up: 04:00–07:00 PM</span>
      </div>

      {/* Special Care Notes (Optional) */}
      <div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Special notes / food habits (optional)..."
          className="w-full bg-[#202c33] border border-[#2a3942] focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 outline-none transition"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!dogName.trim()}
        className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-98 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition cursor-pointer"
      >
        <span>🐾 Confirm &amp; Submit Booking ({pkg.match(/₹[\d,]+/)?.[0] || "₹500"})</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <div className="text-center text-[9px] text-slate-500">
        ⚡ Submits in 1 message • Drastically reduces messaging cost
      </div>
    </form>
  );
}

export default function WhatsAppSimulatorPage() {
  const [phone, setPhone] = useState("919876543210");
  const [customerName, setCustomerName] = useState("Rahul Sharma");
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationStatus, setConversationStatus] = useState("AI_ACTIVE");
  const [paymentModal, setPaymentModal] = useState<{ bookingId: string; amount: number } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = async () => {
    try {
      const res = await fetch(`/api/simulator/chat?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setMessages(data.data.messages || []);
        if (data.data.status) setConversationStatus(data.data.status);
      }
    } catch (err) {
      console.error("Failed to fetch simulator chat", err);
    }
  };

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 2500);
    return () => clearInterval(interval);
  }, [phone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || inputText;
    if (!content.trim() || loading) return;

    setInputText("");
    setLoading(true);

    // Optimistic customer message
    const tempMsg = {
      id: "temp_" + Date.now(),
      sender_type: "CUSTOMER",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await fetch("/api/simulator/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          senderName: customerName,
          content,
        }),
      });
      await fetchChat();
    } catch (err) {
      console.error("Failed to send simulator message", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = async () => {
    if (!confirm("Reset conversation history and AI memory for this customer?")) return;
    try {
      await fetch("/api/simulator/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      setMessages([]);
      setConversationStatus("AI_ACTIVE");
    } catch (err) {
      console.error("Reset failed", err);
    }
  };

  const handleToggleManualMode = async () => {
    try {
      const target = conversationStatus === "HUMAN_ACTIVE" ? "AI_ACTIVE" : "HUMAN_ACTIVE";
      const res = await fetch("/api/core/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, status: target }),
      });
      const data = await res.json();
      if (data.success) {
        setConversationStatus(target);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayCheckout = async (bookingId: string, customAmount?: number) => {
    setPaymentProcessing(true);
    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        alert("Failed to load Razorpay payment SDK. Please verify your internet connection.");
        return;
      }

      // 1. Create order on backend with Razorpay API
      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();
      if (!data.success) {
        alert("Failed to initiate payment: " + (data.error?.message || "Order creation failed"));
        return;
      }

      const { orderId, amount, currency, keyId, booking } = data.data;

      // 2. Open official Razorpay modal popup
      const options = {
        key: keyId,
        amount: amount,
        currency: currency || "INR",
        name: "Needin Pet Resort & Day Care",
        description: `Day Care Booking: ${booking.bookingNumber} (${booking.dogName})`,
        image: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
        order_id: orderId,
        prefill: {
          name: booking.customerName || "Customer",
          contact: booking.customerPhone || phone,
          email: booking.customerEmail || `${phone}@needin.in`,
        },
        notes: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
        theme: {
          color: "#10b981",
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setPaymentProcessing(true);
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: booking.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPaymentModal(null);
              await fetchChat();
            } else {
              alert("Payment verification issue: " + (verifyData.error?.message || "Verification failed"));
            }
          } catch (vErr) {
            console.error("Verification error:", vErr);
            alert("Error confirming payment verification.");
          } finally {
            setPaymentProcessing(false);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        alert("Payment declined: " + (response.error?.description || "Transaction failed"));
        setPaymentProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay Error:", err);
      alert("Error opening Razorpay checkout: " + (err.message || "Unknown error"));
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleSimulatePayment = async (bookingId: string) => {
    setPaymentProcessing(true);
    try {
      const res = await fetch("/api/simulator/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentModal(null);
        await fetchChat();
      } else {
        alert("Payment simulation error: " + (data.error?.message || "Failed"));
      }
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6">
      {/* Top Header */}
      <header className="max-w-4xl w-full flex items-center justify-between py-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Needin WhatsApp Simulator</span>
              <span className="text-emerald-400">🐾</span>
            </h1>
            <p className="text-xs text-slate-400">
              Interactive test console &bull; Service Module #1: Dog Day Care
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Chat</span>
          </button>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition flex items-center gap-1"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Test Controls & Profile Switcher */}
        <div className="md:col-span-5 space-y-4">
          {/* Customer Profile Picker */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Simulated Customer
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setPhone("919876543210");
                  setCustomerName("Rahul Sharma");
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  phone === "919876543210"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <p className="font-bold">Rahul Sharma</p>
                <p className="text-[10px] text-slate-500">Bruno (Golden Retriever)</p>
              </button>

              <button
                onClick={() => {
                  setPhone("919811223344");
                  setCustomerName("Priya Patel");
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  phone === "919811223344"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <p className="font-bold">Priya Patel</p>
                <p className="text-[10px] text-slate-500">Bella (Beagle)</p>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Phone:</span>
              <span className="font-mono text-emerald-400 font-bold">+{phone}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">AI State:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  conversationStatus === "HUMAN_ACTIVE"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                }`}
              >
                {conversationStatus}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Manual Staff Switch:</span>
              <button
                onClick={handleToggleManualMode}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  conversationStatus === "HUMAN_ACTIVE"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
                }`}
              >
                {conversationStatus === "HUMAN_ACTIVE"
                  ? "▶ Switch to AI Mode"
                  : "⏸ Switch to Manual Mode"}
              </button>
            </div>
          </div>

          {/* Quick Simulation Buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Quick Multi-Service Prompts
              </h3>
              <span className="text-[10px] text-blue-400 font-bold">Dog & Car Wash</span>
            </div>

            {/* General */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSendMessage("menu")}
                className="group p-2.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-left font-medium text-slate-200 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-emerald-400 decoration-1 underline-offset-2">
                  ✨ "menu"
                </span>
              </button>
              <button
                onClick={() => handleSendMessage("3")}
                className="group p-2.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-left font-medium text-slate-200 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-emerald-400 decoration-1 underline-offset-2">
                  📋 "3" (Bookings)
                </span>
              </button>
              <button
                onClick={() => handleSendMessage("4")}
                className="group p-2.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs text-left font-medium text-amber-300 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-amber-400 decoration-1 underline-offset-2">
                  🤝 "4" (Support)
                </span>
              </button>
            </div>

            {/* Service 1: Dog Day Care */}
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider pt-1 flex items-center gap-1.5">
              <span>🐶 Dog Day Care</span>
              <span className="h-px flex-1 bg-emerald-500/20" />
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSendMessage("1")}
                className="group p-2.5 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-xs text-left font-semibold text-emerald-300 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-emerald-400 decoration-1 underline-offset-2">
                  🐾 "1" (Select Dog Care)
                </span>
              </button>
              <button
                onClick={() => handleSendMessage("Max")}
                className="group p-2.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-left font-medium text-slate-200 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-emerald-400 decoration-1 underline-offset-2">
                  🐕 "Max" (Dog Name)
                </span>
              </button>
            </div>

            {/* Service 2: Car Wash */}
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider pt-1 flex items-center gap-1.5">
              <span>🚗 Car Wash & Detailing</span>
              <span className="h-px flex-1 bg-blue-500/20" />
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSendMessage("2")}
                className="group p-2.5 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/30 hover:border-blue-500/60 rounded-xl text-xs text-left font-semibold text-blue-300 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-blue-400 decoration-1 underline-offset-2">
                  🚗 "2" (Select Car Wash)
                </span>
              </button>
              <button
                onClick={() => handleSendMessage("1")}
                className="group p-2.5 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/30 hover:border-blue-500/60 rounded-xl text-xs text-left font-semibold text-blue-300 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-blue-400 decoration-1 underline-offset-2">
                  🚿 "1" (Quick Foam Wash)
                </span>
              </button>
              <button
                onClick={() => handleSendMessage("3")}
                className="group p-2.5 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/30 hover:border-blue-500/60 rounded-xl text-xs text-left font-semibold text-blue-300 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-blue-400 decoration-1 underline-offset-2">
                  🚙 "3" (SUV Category)
                </span>
              </button>
              <button
                onClick={() => handleSendMessage("KA01MJ4421")}
                className="group p-2.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-left font-mono font-bold text-white transition shadow-xs"
              >
                <span className="group-hover:underline decoration-cyan-400 decoration-1 underline-offset-2">
                  🚘 "KA01MJ4421"
                </span>
              </button>
              <button
                onClick={() => handleSendMessage("today 11:00 AM")}
                className="group p-2.5 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-left font-medium text-cyan-300 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-cyan-400 decoration-1 underline-offset-2">
                  ⏰ "today 11:00 AM"
                </span>
              </button>
              <button
                onClick={() => handleSendMessage("YES")}
                className="group p-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-xs text-left font-bold text-emerald-400 transition shadow-xs"
              >
                <span className="group-hover:underline decoration-emerald-400 decoration-1 underline-offset-2">
                  ✅ "YES" (Confirm)
                </span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-blue-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Service Architecture:</span>
            </p>
            <p>Send "menu" to see both Dog Day Care and Car Wash.</p>
            <p>Select "1" for Dog Day Care or "2" for Car Wash.</p>
            <p>Customers, Payments, and Audit Logs are shared Core models!</p>
          </div>
        </div>

        {/* Right: Realistic Smartphone Mockup */}
        <div className="md:col-span-7 flex justify-center">
          <div className="w-full max-w-[380px] h-[640px] bg-slate-900 border-4 border-slate-800 rounded-[36px] shadow-2xl flex flex-col overflow-hidden relative">
            {/* Phone Speaker Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
            </div>

            {/* WhatsApp Header Bar */}
            <div className="bg-emerald-800 text-white pt-7 pb-3 px-4 flex items-center justify-between shadow-md z-10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-700 border border-emerald-600 flex items-center justify-center font-bold text-sm">
                  🐾
                </div>
                <div>
                  <h2 className="text-sm font-bold leading-tight">Needin Pet Care</h2>
                  <p className="text-[10px] text-emerald-200">
                    {conversationStatus === "HUMAN_ACTIVE" ? "Connected with Staff" : "AI Business Assistant"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-100">
                <PhoneCall className="w-4 h-4 opacity-80" />
              </div>
            </div>

            {/* WhatsApp Chat Messages Scrollable Area */}
            <div
              className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#0c1317] relative text-xs"
              style={{
                backgroundImage: `radial-gradient(#1f2c34 0.75px, transparent 0.75px)`,
                backgroundSize: "16px 16px",
              }}
            >
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <Bot className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                  <p>Send "Hi" or select an option to start chat.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isCustomer = msg.sender_type === "CUSTOMER";
                  const hasPaymentLink =
                    msg.content?.includes("/simulator?paymentBookingId=") ||
                    msg.content?.includes("/pay/") ||
                    msg.content?.toLowerCase().includes("payment link");
                  let bookingIdToPay = "";
                  if (hasPaymentLink) {
                    const match =
                      msg.content.match(/paymentBookingId=([a-zA-Z0-9_-]+)/) ||
                      msg.content.match(/\/pay\/([a-zA-Z0-9_-]+)/);
                    if (match) bookingIdToPay = match[1];
                  }

                  let amountToPay = 500;
                  const amtMatch =
                    msg.content.match(/amount=([0-9.]+)/) ||
                    msg.content.match(/₹([0-9,]+)/) ||
                    msg.content.match(/Rs\.?\s*([0-9,]+)/i);
                  if (amtMatch) amountToPay = parseFloat(amtMatch[1].replace(/,/g, "")) || 500;

                  const isBookingFormMessage = !isCustomer && (
                    msg.content?.toLowerCase().includes("booking form") ||
                    msg.content?.includes("BOOKING_FORM") ||
                    msg.content?.toLowerCase().includes("reserve your dog's visit") ||
                    msg.content?.toLowerCase().includes("fill in your booking details")
                  );

                  const options = !isCustomer && !isBookingFormMessage ? extractInteractiveButtons(msg.content) : [];
                  const displayContent = cleanMessageContent(msg.content, options);

                  const subsequentMessages = messages.slice(index + 1);
                  const isFormAlreadySubmitted = subsequentMessages.some(
                    (m) =>
                      m.sender_type === "CUSTOMER" &&
                      (m.content?.toLowerCase().includes("booking request") ||
                        m.content?.toLowerCase().includes("dog name") ||
                        m.content?.toLowerCase().includes("booking form submitted"))
                  );

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[88%] sm:max-w-[82%] rounded-2xl shadow-sm leading-relaxed overflow-hidden ${
                          isCustomer
                            ? "bg-[#005c4b] text-white rounded-br-xs"
                            : "bg-[#202c33] text-slate-100 rounded-bl-xs border border-[#2a3942]/70"
                        }`}
                      >
                        {/* Formatted Text Message Content */}
                        <div className="p-3 sm:p-3.5 text-xs">
                          {renderDecoratedWhatsAppText(displayContent)}

                          {/* Time & Read Receipts */}
                          <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-slate-400 font-mono">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isCustomer && (
                              <span className="text-[#53bdeb] font-bold text-[10px]">✓✓</span>
                            )}
                          </div>
                        </div>

                        {/* Interactive In-Chat WhatsApp Flow Booking Form */}
                        {isBookingFormMessage && (
                          <InChatBookingForm
                            isSubmitted={isFormAlreadySubmitted}
                            onSubmit={(details) => {
                              const summaryText = `📝 *Dog Day Care Booking Request*\n• Dog Name: ${details.dogName}\n• Breed: ${details.breed}\n• Date: ${details.date}\n• Time Slot: ${details.timeSlot}\n• Package: ${details.packageType}${details.notes ? `\n• Notes: ${details.notes}` : ""}`;
                              handleSendMessage(summaryText);
                            }}
                          />
                        )}

                        {/* WhatsApp Official Style Full-Width Interactive Action Buttons */}
                        {options.length > 0 && (
                          <div className="border-t border-[#2a3942] divide-y divide-[#2a3942] bg-[#202c33]">
                            {options.map((opt, optIdx) => (
                              <button
                                key={`${opt.action}-${optIdx}`}
                                type="button"
                                onClick={() => handleSendMessage(opt.action)}
                                className="w-full py-2.5 px-3.5 flex items-center justify-between text-left text-xs font-semibold text-slate-200 hover:text-white bg-[#202c33] hover:bg-[#2a3942] active:bg-[#182229] transition-all group"
                              >
                                <span className="flex items-center gap-2.5 min-w-0 pr-2">
                                  {opt.icon && <span className="text-sm shrink-0">{opt.icon}</span>}
                                  <span className="text-slate-200 group-hover:text-emerald-300 tracking-wide truncate">
                                    {opt.label}
                                  </span>
                                </span>
                                <span className="flex items-center shrink-0">
                                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5" />
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Interactive Payment Button inside Chat Bubble */}
                        {hasPaymentLink && bookingIdToPay && (
                          <div className="p-3 border-t border-[#2a3942] bg-[#182229]/60">
                            <button
                              type="button"
                              onClick={() => handleRazorpayCheckout(bookingIdToPay, amountToPay)}
                              className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-98 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition group cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span className="font-extrabold tracking-wide">
                                Pay ₹{amountToPay} via Razorpay
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-80 group-hover:translate-x-0.5 transition" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Shortcuts Bar */}
            <div className="px-2.5 py-1.5 bg-[#182229] border-t border-[#2a3942]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => handleSendMessage("Book Day Care")}
                disabled={loading}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>🐾 Book Day Care Form</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Pricing & Packages")}
                disabled={loading}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#202c33] border border-[#2a3942] text-slate-300 hover:bg-[#2a3942] transition shrink-0 cursor-pointer"
              >
                💳 Pricing
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Location & Timings")}
                disabled={loading}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#202c33] border border-[#2a3942] text-slate-300 hover:bg-[#2a3942] transition shrink-0 cursor-pointer"
              >
                📍 Location
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("My Bookings")}
                disabled={loading}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition shrink-0 cursor-pointer"
              >
                📋 My Bookings
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Menu")}
                disabled={loading}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#202c33] border border-[#2a3942] text-slate-300 hover:bg-[#2a3942] transition shrink-0 cursor-pointer"
              >
                📋 Menu
              </button>
            </div>

            {/* WhatsApp Input Bar */}
            <div className="p-2.5 bg-[#202c33] flex items-center gap-2 border-t border-slate-800 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder="Type message..."
                disabled={loading}
                className="flex-1 bg-[#2a3942] text-slate-100 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={loading || !inputText.trim()}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 flex items-center justify-center shrink-0 shadow transition"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Razorpay Secure Checkout</h3>
                  <p className="text-[10px] text-slate-400">Integrated Payment Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModal(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span>Payable Amount:</span>
                <span className="font-bold text-emerald-400 text-sm">₹{paymentModal.amount}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Booking Reference:</span>
                <span className="font-mono text-slate-300">{paymentModal.bookingId.slice(0, 14)}...</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Payment Methods:</span>
                <span className="text-slate-300">UPI, Card, NetBanking, QR</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleRazorpayCheckout(paymentModal.bookingId, paymentModal.amount)}
                disabled={paymentProcessing}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 active:scale-98 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
              >
                {paymentProcessing ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₹{paymentModal.amount} with Razorpay</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSimulatePayment(paymentModal.bookingId)}
                disabled={paymentProcessing}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant Test Sandbox (One-Click)</span>
              </button>

              <div className="pt-1 text-center">
                <Link
                  href={`/pay/${paymentModal.bookingId}`}
                  target="_blank"
                  className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Standalone Checkout Page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <button
              onClick={() => setPaymentModal(null)}
              className="w-full py-1.5 text-slate-400 hover:text-slate-200 text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
