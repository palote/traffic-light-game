// src/pages/ReferralPage.tsx
import { useState } from "react";
import { ref, push, serverTimestamp } from "firebase/database";
import { database } from "../firebase.config";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";

export function ReferralPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    referredName: "",
    referredEmail: "",
    referredSchool: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setStatus("loading");

    try {
      const referralsRef = ref(database, "referrals");
      await push(referralsRef, {
        referrerId: user.uid,
        referrerEmail: user.email,
        referrerName: user.displayName || "",
        ...formData,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setStatus("success");
      setFormData({ referredName: "", referredEmail: "", referredSchool: "", message: "" });
    } catch (error) {
      console.error("Error submitting referral:", error);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
        <div
          style={{
            maxWidth: 500,
            margin: "60px auto",
            background: "white",
            borderRadius: 16,
            padding: 40,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1 style={{ color: "#10b981", marginBottom: 8 }}>{t.referral.successTitle}</h1>
          <p style={{ color: "#64748b", marginBottom: 24 }}>{t.referral.successMessage}</p>
          <div
            style={{
              background: "#fef3c7",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 4 }}>
              {t.referral.rewards}
            </div>
            <div style={{ color: "#a16207" }}>{t.referral.rewardsDetail}</div>
          </div>
          <a
            href="/dashboard"
            style={{
              display: "inline-block",
              background: "#3b82f6",
              color: "white",
              padding: "12px 24px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t.referral.backToDashboard}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
      <div
        style={{
          maxWidth: 500,
          margin: "40px auto",
          background: "white",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: 24 }}>{t.referral.title}</h1>
          <p style={{ color: "#64748b", marginTop: 8 }}>{t.referral.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                color: "#374151",
              }}
            >
              {t.referral.referredName} *
            </label>
            <input
              type="text"
              required
              value={formData.referredName}
              onChange={(e) => setFormData({ ...formData, referredName: e.target.value })}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                color: "#374151",
              }}
            >
              {t.referral.referredEmail} *
            </label>
            <input
              type="email"
              required
              value={formData.referredEmail}
              onChange={(e) => setFormData({ ...formData, referredEmail: e.target.value })}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                color: "#374151",
              }}
            >
              {t.referral.referredSchool}
            </label>
            <input
              type="text"
              value={formData.referredSchool}
              onChange={(e) => setFormData({ ...formData, referredSchool: e.target.value })}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                color: "#374151",
              }}
            >
              {t.referral.message}
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={t.referral.messagePlaceholder}
              rows={3}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {status === "error" && (
            <div
              style={{
                background: "#fef2f2",
                color: "#dc2626",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {t.referral.errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              width: "100%",
              padding: 14,
              background: status === "loading" ? "#9ca3af" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: status === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {status === "loading" ? t.referral.sending : t.referral.submit}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#f0fdf4",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 600, color: "#166534", marginBottom: 4 }}>
            {t.referral.rewards}
          </div>
          <div style={{ color: "#15803d", fontSize: 14 }}>{t.referral.rewardsDetail}</div>
        </div>
      </div>
    </div>
  );
}