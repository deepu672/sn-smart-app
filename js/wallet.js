/* ==========================================================================
   SN SMART - CLOUD WALLET & LEDGER ENGINE (ANTI-HACK)
   ========================================================================== */

class CloudWalletManager {
    constructor() {
        this.userData = {
            coins: 0,
            dailySpins: 0,
            dailyScratches: 0,
            dailyAds: 0,
            lastDate: new Date().toDateString()
        };
        this.history = [];
    }

    async syncWithCloud(user, db) {
        if (!user || !db) return;
        const userRef = db.collection("users").doc(user.uid);
        const today = new Date().toDateString();

        try {
            const doc = await userRef.get();
            if (doc.exists) {
                this.userData = doc.data();
                if (this.userData.lastDate !== today) {
                    this.userData.dailySpins = 0;
                    this.userData.dailyScratches = 0;
                    this.userData.dailyAds = 0;
                    this.userData.lastDate = today;
                    await userRef.set(this.userData, { merge: true });
                }
            } else {
                this.userData = {
                    displayName: user.displayName || "Player",
                    email: user.email || "",
                    photoURL: user.photoURL || "",
                    coins: 50, // वेलकम बोनस
                    dailySpins: 0,
                    dailyScratches: 0,
                    dailyAds: 0,
                    lastDate: today
                };
                await userRef.set(this.userData);
            }
            this.syncUI();
            this.loadLedger(user, db);
        } catch (err) {
            console.error("Cloud Wallet Sync Error: ", err);
        }
    }

    async addCoins(amount, title, user, db) {
        if (!user || !db) return;
        const userRef = db.collection("users").doc(user.uid);
        const txnRef = userRef.collection("transactions").doc();

        try {
            await userRef.update({
                coins: firebase.firestore.FieldValue.increment(amount),
                dailySpins: this.userData.dailySpins,
                dailyScratches: this.userData.dailyScratches,
                dailyAds: this.userData.dailyAds
            });

            await txnRef.set({
                type: "credit",
                title: title || "Reward Claimed",
                amount: amount,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            this.userData.coins += amount;
            this.syncUI();
            this.loadLedger(user, db);
        } catch (err) {
            console.error("Failed to credit coins: ", err);
        }
    }

    async deductCoins(amount, payoutDetails, user, db) {
        if (!user || !db) return false;
        if (this.userData.coins < amount) return false;

        const userRef = db.collection("users").doc(user.uid);
        const txnRef = userRef.collection("transactions").doc();

        try {
            await userRef.update({
                coins: firebase.firestore.FieldValue.increment(-amount)
            });

            await txnRef.set({
                type: "debit",
                title: `Withdrawal (${payoutDetails.method.toUpperCase()}) - ${payoutDetails.account}`,
                amount: amount,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            this.userData.coins -= amount;
            this.syncUI();
            this.loadLedger(user, db);
            return true;
        } catch (err) {
            console.error("Failed to deduct coins: ", err);
            return false;
        }
    }

    async loadLedger(user, db) {
        if (!user || !db) return;
        try {
            const snap = await db.collection("users").doc(user.uid)
                .collection("transactions")
                .limit(15)
                .get();

            this.history = [];
            snap.forEach(doc => this.history.push(doc.data()));
            this.renderHistoryList();
        } catch (e) {
            console.error("Ledger read error: ", e);
        }
    }

    syncUI() {
        const coins = this.userData.coins || 0;
        const inr = (coins / APP_CONFIG.currency.coinRatio).toFixed(2);

        const elHeader = document.getElementById("topNavBalance");
        const elDash = document.getElementById("dashCoinCount");
        const elWallet = document.getElementById("walletBalance");
        const elFiat = document.getElementById("dashFiatEstimate");
        const elValuation = document.getElementById("walletCashValuation");

        if (elHeader) elHeader.innerText = coins.toLocaleString();
        if (elDash) elDash.innerText = coins.toLocaleString();
        if (elWallet) elWallet.innerText = `${coins.toLocaleString()} Coins`;
        if (elFiat) elFiat.innerText = `≈ ₹${inr} INR`;
        if (elValuation) elValuation.innerText = `Value: ₹${inr} INR`;

        const minPayout = APP_CONFIG.currency.minPayoutCoins;
        const progressPct = Math.min(100, Math.floor((coins / minPayout) * 100));
        const elBar = document.getElementById("payoutProgress");
        const elPct = document.getElementById("payoutProgressPct");

        if (elBar) elBar.style.width = `${progressPct}%`;
        if (elPct) elPct.innerText = `${progressPct}%`;

        // 15-15 कोटा अपडेट
        const remSpins = Math.max(0, APP_CONFIG.security.maxAdmobSpins - this.userData.dailySpins);
        const remScratches = Math.max(0, APP_CONFIG.security.maxUnityScratches - this.userData.dailyScratches);
        const remAds = Math.max(0, APP_CONFIG.security.maxMonetagTasks - this.userData.dailyAds);

        const elHomeSpin = document.getElementById("homeSpinQuota");
        const elHomeScratch = document.getElementById("homeScratchQuota");
        const elSpinBadge = document.getElementById("spinQuota");
        const elScratchBadge = document.getElementById("scratchQuota");
        const elWatchBadge = document.getElementById("quotaWatchAds");

        if (elHomeSpin) elHomeSpin.innerText = `${remSpins} Left`;
        if (elHomeScratch) elHomeScratch.innerText = `${remScratches} Left`;
        if (elSpinBadge) elSpinBadge.innerText = `${remSpins}/${APP_CONFIG.security.maxAdmobSpins} Left`;
        if (elScratchBadge) elScratchBadge.innerText = `${remScratches}/${APP_CONFIG.security.maxUnityScratches} Left`;
        if (elWatchBadge) elWatchBadge.innerText = `${remAds}/${APP_CONFIG.security.maxMonetagTasks} Left`;

        // प्रोफाइल स्टेटिस्टिक्स
        const elStatSpins = document.getElementById("statTotalSpins");
        const elStatScratches = document.getElementById("statTotalScratches");
        const elStatAds = document.getElementById("statTotalAds");

        if (elStatSpins) elStatSpins.innerText = `${this.userData.dailySpins}/${APP_CONFIG.security.maxAdmobSpins}`;
        if (elStatScratches) elStatScratches.innerText = `${this.userData.dailyScratches}/${APP_CONFIG.security.maxUnityScratches}`;
        if (elStatAds) elStatAds.innerText = `${this.userData.dailyAds}/${APP_CONFIG.security.maxMonetagTasks}`;
    }

    renderHistoryList() {
        const stream = document.getElementById("txHistoryList");
        if (!stream) return;

        if (this.history.length === 0) {
            stream.innerHTML = `
                <div class="empty-tip">
                    <i class="fa-solid fa-receipt"></i>
                    <p>No transactions yet. Start playing!</p>
                </div>
            `;
            return;
        }

        let html = "";
        this.history.forEach(item => {
            const isCredit = item.type === "credit";
            const color = isCredit ? "#22c55e" : "#ef4444";
            const sign = isCredit ? "+" : "-";

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:10px; margin-bottom:8px;">
                    <div>
                        <strong style="font-size:13px; color:#f8fafc; display:block;">${item.title}</strong>
                        <span style="font-size:11px; color:#94a3b8;">${item.timestamp}</span>
                    </div>
                    <span style="font-weight:700; color:${color}; font-size:14px;">${sign}${item.amount}</span>
                </div>
            `;
        });
        stream.innerHTML = html;
    }
}

const cloudWallet = new CloudWalletManager();
              
