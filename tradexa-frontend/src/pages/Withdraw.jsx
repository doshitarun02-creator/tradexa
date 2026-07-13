import React, { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";
import client from "../api/client";
import Layout from "../components/Layout";
import Toast from "../components/Toast";

const STATUS_LABELS = {
  pending: "Pending Review",
  approved: "Approved — Payout in Progress",
  rejected: "Rejected",
  completed: "Completed",
  failed: "Failed (Refunded)",
};

const Withdraw = () => {
  const { user, refreshMe } = useAuth();
  const [pointsRequested, setPointsRequested] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [noteByUser, setNoteByUser] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const loadRequests = async () => {
    try {
      const res = await client.get("/redemptions/my-requests", { params: { limit: 10 } });
      const root = res?.data?.data ?? {};
      setRequests(root.redemptions || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const hasPendingRequest = requests.some((r) => r.status === "pending");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requestedVal = parseFloat(pointsRequested);

    if (Number.isNaN(requestedVal) || requestedVal <= 0) {
      setToast({ type: "error", message: "Enter a valid points amount." });
      return;
    }
    if (requestedVal > (user?.points_balance || 0)) {
      setToast({ type: "error", message: "Insufficient points balance." });
      return;
    }
    if (!payoutDetails.trim()) {
      setToast({ type: "error", message: "Enter your bank account or UPI details." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post("/redemptions", {
        points_requested: requestedVal,
        payout_method: payoutMethod,
        payout_details: payoutDetails,
        note_by_user: noteByUser || null,
      });
      if (res.data?.success) {
        setPointsRequested("");
        setPayoutDetails("");
        setNoteByUser("");
        setToast({ type: "success", message: "Redeem request submitted for admin review." });
        await Promise.all([loadRequests(), refreshMe()]);
      } else {
        setToast({ type: "error", message: res.data?.message || "Failed to submit redeem request." });
      }
    } catch (err) {
      setToast({ type: "error", message: err?.response?.data?.message || "Failed to submit redeem request." });
    } finally {
      setSubmitting(false);
    }
  };

  const pointsBalance = user?.points_balance
    ? Number(user.points_balance).toLocaleString("en-IN")
    : "0";

  return (
    <Layout>
      <div className="ot-page">
        <h1 className="ot-page-title">Redeem Request</h1>

        <div className="ot-balance-card">
          <p className="ot-balance-label">Available Points</p>
          <p className="ot-balance-value">{pointsBalance} pts</p>
        </div>

        {hasPendingRequest ? (
          <div className="ot-fine-print" style={{ marginTop: "16px" }}>
            You already have a pending redeem request. It must be reviewed by an
            administrator before you can submit a new one.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ot-withdraw-form">
            <label className="ot-auth-label">Points to Redeem</label>
            <input
              type="number"
              required
              min="1"
              className="ot-withdraw-input"
              placeholder="Enter points amount"
              value={pointsRequested}
              onChange={(e) => setPointsRequested(e.target.value)}
            />

            <label className="ot-auth-label">Payout Method</label>
            <select
              className="ot-withdraw-select"
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>

            <label className="ot-auth-label">
              {payoutMethod === "upi" ? "UPI ID" : "Bank Account Details"}
            </label>
            <input
              type="text"
              required
              className="ot-withdraw-input"
              placeholder={payoutMethod === "upi" ? "example@upi" : "Account number, IFSC, name"}
              value={payoutDetails}
              onChange={(e) => setPayoutDetails(e.target.value)}
            />

            <label className="ot-auth-label">Note (optional)</label>
            <input
              type="text"
              className="ot-withdraw-input"
              placeholder="Anything the admin should know"
              value={noteByUser}
              onChange={(e) => setNoteByUser(e.target.value)}
            />

            <button type="submit" className="ot-auth-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Redeem Request"}
            </button>
          </form>
        )}

        <p className="ot-fine-print">
          Redeem requests are reviewed manually by an administrator. Once approved,
          your points are deducted and the equivalent cash payout is sent to you
          offline. Processing time: 1–24 hours.
        </p>

        <div className="ot-transactions-card">
          <h3 className="ot-summary-title">Your Redeem Requests</h3>
          {loading ? (
            <p className="ot-empty-state">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="ot-empty-state">No redeem requests yet.</p>
          ) : (
            requests.map((r) => (
              <div className="ot-transaction-row" key={r.id}>
                <div>
                  <p className="ot-transaction-title">{r.points_requested} pts</p>
                  <p className="ot-transaction-sub">
                    {r.payout_method === "upi" ? "UPI" : "Bank Transfer"} • {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  {r.note_by_admin && (
                    <p className="ot-transaction-sub">Admin note: {r.note_by_admin}</p>
                  )}
                </div>
                <span className={`ot-status-${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
      {toast && <Toast open={Boolean(toast)} type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </Layout>
  );
};

export default Withdraw;
