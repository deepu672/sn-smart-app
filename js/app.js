/* ==========================================================================
   SN SMART - MASTER APP CONTROLLER (3.2s SPLASH TIMER & 45 REWARDS)
   ========================================================================== */

let auth, db, currentUser = null;
let wheelInstance = null;
let scratchInstance = null;
let lastAdTimestamp = 0;

window.addEventListener("DOMContentLoaded", () => {
    // 1. Firebase Initializer
    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();

    // 2. Cinematic Orbital Splash Timer (5 Seconds)
    setTimeout(() => {
        const splash = document.getElementById("splashScreen");
        if (splash) splash.classList.add("hidden");

        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                document.getElementById("authScreen").classList.add("hidden");
                document.getElementById("mainApp").classList.remove("hidden");
                updateUserDisplay(user);
                cloudWallet.syncWithCloud(user, db);
            } else {
                currentUser = null;
                document.getElementById("authScreen").classList.remove("hidden");
                document.getElementById("mainApp").classList.add("hidden");
            }
        });
    }, 5000);

    // 3. Components Startup
    wheelInstance = new LuckyWheelEngine();
    scratchInstance = new ScratchCardEngine();

    bindNavigation();
    bindAdActions();
    bindWalletWithdraw();
});

function updateUserDisplay(user) {
    const dName = user.displayName || "Player";
    const dEmail = user.email || "Verified Account";
    const dPhoto = user.photoURL || "https://api.dicebear.com/7.x/bottts/svg?seed=SnUser";

    document.getElementById("topNavName").innerText = dName;
    document.getElementById("profileFullName").innerText = dName;
    document.getElementById("profileFullEmail").innerText = dEmail;
    document.getElementById("topNavAvatar").src = dPhoto;
    document.getElementById("profileFullAvatar").src = dPhoto;
}

// NAVIGATION
function switchScreen(screenId) {
    document.querySelectorAll(".screen-view").forEach(s => s.classList.remove("active-view"));
    document.querySelectorAll(".dock-item").forEach(b => b.classList.remove("active"));

    const target = document.getElementById(screenId);
    if (target) target.classList.add("active-view");

    const dockBtn = document.querySelector(`.dock-item[data-target="${screenId}"]`);
    if (dockBtn) dockBtn.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindNavigation() {
    document.querySelectorAll(".dock-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-target");
            switchScreen(target);
        });
    });

    document.getElementById("headerProfileTrigger").addEventListener("click", () => switchScreen("viewProfile"));
    document.getElementById("headerWalletTrigger").addEventListener("click", () => switchScreen("viewWallet"));
    document.getElementById("jumpToSpin").addEventListener("click", () => switchScreen("viewSpin"));
    document.getElementById("jumpToScratch").addEventListener("click", () => switchScreen("viewScratch"));

    document.getElementById("btnGoogleSignIn").addEventListener("click", () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => alert("Sign In Note: " + err.message));
    });

    document.getElementById("btnLogout").addEventListener("click", () => {
        auth.signOut().then(() => alert("Logged out successfully."));
    });

    document.getElementById("btnCloseModal").addEventListener("click", () => {
        document.getElementById("claimModal").classList.add("hidden");
    });
}

function checkSafetyCooldown(timerWrapId, timerSecId) {
    const now = Date.now();
    const elapsed = Math.floor((now - lastAdTimestamp) / 1000);
    const cooldown = APP_CONFIG.security.cooldownSeconds;

    if (elapsed < cooldown) {
        const rem = cooldown - elapsed;
        const wrap = document.getElementById(timerWrapId);
        const sec = document.getElementById(timerSecId);
        if (wrap && sec) {
            wrap.classList.remove("hidden");
            sec.innerText = `${rem}s`;
            let c = rem;
            const t = setInterval(() => {
                c--;
                if (c <= 0) {
                    clearInterval(t);
                    wrap.classList.add("hidden");
                } else {
                    sec.innerText = `${c}s`;
                }
            }, 1000);
        }
        return false;
    }
    lastAdTimestamp = now;
    return true;
}

function triggerRewardModal(amt) {
    document.getElementById("modalAwardCount").innerText = `+${amt}`;
    document.getElementById("claimModal").classList.remove("hidden");
}

function bindAdActions() {
    document.getElementById("btnSpinWheel").addEventListener("click", () => {
        if (cloudWallet.userData.dailySpins >= APP_CONFIG.security.maxAdmobSpins) {
            return alert("Daily spin quota (15/15) reached! Come back tomorrow.");
        }
        if (!checkSafetyCooldown("spinTimerBox", "spinTimerSeconds")) return;

        const spinBtn = document.getElementById("btnSpinWheel");
        spinBtn.disabled = true;

        wheelInstance.spin((wonSlice) => {
            spinBtn.disabled = false;
            cloudWallet.userData.dailySpins++;
            cloudWallet.addCoins(wonSlice.value, `Lucky Wheel (${wonSlice.label})`, currentUser, db);
            triggerRewardModal(wonSlice.value);
        });
    });

    document.getElementById("btnClaimScratch").addEventListener("click", () => {
        const prize = scratchInstance.currentPrize;
        cloudWallet.userData.dailyScratches++;
        cloudWallet.addCoins(prize, "Scratch Card Prize", currentUser, db);
        triggerRewardModal(prize);
        document.getElementById("btnClaimScratch").classList.add("hidden");
    });

    document.getElementById("btnNewScratch").addEventListener("click", () => {
        if (cloudWallet.userData.dailyScratches >= APP_CONFIG.security.maxUnityScratches) {
            return alert("Daily scratch card quota (15/15) reached!");
        }
        if (!checkSafetyCooldown("scratchTimerBox", "scratchTimerSeconds")) return;
        scratchInstance.resetCard();
    });

    document.getElementById("btnWatchVideoAd").addEventListener("click", () => {
        if (cloudWallet.userData.dailyAds >= APP_CONFIG.security.maxMonetagTasks) {
            return alert("Daily watch ads quota (15/15) completed!");
        }
        if (!checkSafetyCooldown("spinTimerBox", "spinTimerSeconds")) return;

        window.open(APP_CONFIG.monetag.smartlinkUrl, "_blank", "noopener,noreferrer");
        cloudWallet.userData.dailyAds++;
        cloudWallet.addCoins(25, "Sponsored Video Stream", currentUser, db);
        triggerRewardModal(25);
    });

    document.getElementById("btnClaimDaily").addEventListener("click", (e) => {
        window.open(APP_CONFIG.monetag.smartlinkUrl, "_blank", "noopener,noreferrer");
        e.target.disabled = true;
        e.target.innerText = "Claimed";
        cloudWallet.addCoins(50, "Daily Streak Check-in", currentUser, db);
        triggerRewardModal(50);
    });
}

function bindWalletWithdraw() {
    const chips = document.querySelectorAll(".payout-chip");
    let method = "upi";

    chips.forEach(c => {
        c.addEventListener("click", () => {
            chips.forEach(x => x.classList.remove("active"));
            c.classList.add("active");
            method = c.getAttribute("data-method");

            const lbl = document.getElementById("lblPayoutInput");
            const inp = document.getElementById("payoutInput");
            if (method === "upi") {
                lbl.innerText = "UPI ID (e.g. name@upi)";
                inp.placeholder = "Enter valid UPI ID";
            } else if (method === "paytm") {
                lbl.innerText = "Paytm Registered Mobile Number";
                inp.placeholder = "10-digit Paytm Number";
            } else {
                lbl.innerText = "Email for Google Play Gift Code";
                inp.placeholder = "Enter valid Email address";
            }
        });
    });

    document.getElementById("btnSubmitWithdraw").addEventListener("click", async () => {
        const inp = document.getElementById("payoutInput");
        const val = parseInt(document.getElementById("payoutPackageSelect").value, 10);

        if (!inp.value.trim()) return alert("Please enter valid account/payout details.");
        if (cloudWallet.userData.coins < val) {
            return alert(`Insufficient coins! You need ${val} coins to withdraw.`);
        }

        const ok = await cloudWallet.deductCoins(val, { method, account: inp.value.trim() }, currentUser, db);
        if (ok) {
            alert("Withdrawal request recorded in cloud! Payout will be sent within 24-48 hours.");
            inp.value = "";
        }
    });
      }
                  
