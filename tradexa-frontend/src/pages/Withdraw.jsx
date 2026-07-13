import React, { useState } from "react";
import useAuth from "../hooks/useAuth";

const Withdraw = () => {
  const { user, updateWallet } = useAuth();
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("HDFC Bank • XXXX4321");
  const [upi, setUpi] = useState("");
  const [withdrawals, setWithdrawals] = useState([
    { id: 1, amount: 2000, status: "Completed", date: "Yesterday" },
    { id: 2, amount: 5000, status: "Completed", date: "05 Jul" },
    { id: 3, amount: 1200, status: "Pending", date: "Today" },
  ]);

  const handleRequest = (e) => {
    e.preventDefault();
    const withdrawVal = parseFloat(amount);

    if (Number.isNaN(withdrawVal) || withdrawVal < 100) {
      alert("Minimum withdrawal amount is ₹100.");
      return;
    }

    if (withdrawVal > (user?.wallet || 0)) {
      alert("Insufficient wallet balance.");
      return;
    }

    // Deduct and add to list
    const newBal = (user?.wallet || 0) - withdrawVal;
    updateWallet(newBal);

    setWithdrawals((prev) => [
      {
        id: Date.now(),
        amount: withdrawVal,
        status: "Pending",
        date: "Today",
      },
      ...prev,
    ]);

    setAmount("");
    setUpi("");
    alert(`Withdrawal request for ₹${withdrawVal} has been submitted!`);
  };

  const walletBalance = user?.wallet ? Number(user.wallet).toLocaleString("en-IN") : "0";

  return (
    <div>
      <header className="ot-header">
        <b>Withdraw Funds</b>
      </header>

      <div className="ot-container">
        {/* Balance Card */}
        <div className="ot-card">
          <div className="ot-sub">Available Balance</div>
          <div className="ot-balance">₹{walletBalance}.00</div>
        </div>

        {/* Input Card Form */}
        <div className="ot-card">
          <form onSubmit={handleRequest}>
            <label className="ot-withdraw-label">Withdraw Amount</label>
            <input
              type="number"
              required
              min={100}
              className="ot-withdraw-input"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <label className="ot-withdraw-label">Select Bank Account</label>
            <select
              className="ot-withdraw-select"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            >
              <option value="HDFC Bank • XXXX4321">HDFC Bank • XXXX4321</option>
              <option value="ICICI Bank • XXXX9832">ICICI Bank • XXXX9832</option>
              <option value="SBI • XXXX7715">SBI • XXXX7715</option>
            </select>

            <label className="ot-withdraw-label">UPI ID (Optional)</label>
            <input
              type="text"
              className="ot-withdraw-input"
              placeholder="example@upi"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
            />

            <button type="submit" className="ot-withdraw-button">
              Request Withdrawal
            </button>
          </form>

          <div className="ot-note">
            Processing time: 1–24 hours.
            <br />
            Minimum withdrawal: ₹100.
          </div>
        </div>

        {/* History card */}
        <div className="ot-card">
          <h3 style={{ margin: "0 0 10px", fontSize: "16px" }}>Recent Withdrawals</h3>
          {withdrawals.map((w) => (
            <p key={w.id} style={{ margin: "8px 0", fontSize: "14px" }}>
              ₹{w.amount.toLocaleString("en-IN")} • {w.status} • {w.date}
            </p>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Withdraw;
