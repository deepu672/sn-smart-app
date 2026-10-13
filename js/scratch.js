/* ==========================================================================
   SN SMART - SCRATCH ARENA ENGINE (UNITY ADS REWARDED)
   ========================================================================== */

class ScratchCardEngine {
    constructor() {
        this.canvas = document.getElementById("scratchCanvas");
        this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
        this.isScratching = false;
        this.isRevealed = false;
        this.currentPrize = 50;

        if (this.canvas) {
            this.initEvents();
            this.resetCard(50);
        }
    }

    resetCard(prizeAmount) {
        if (!this.ctx) return;
        this.currentPrize = prizeAmount || (Math.floor(Math.random() * 45) + 25);
        this.isRevealed = false;

        const valEl = document.getElementById("scratchPrizeVal");
        if (valEl) valEl.innerText = `+${this.currentPrize}`;

        const ctx = this.ctx;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#64748b";
        ctx.fillRect(0, 0, 280, 200);

        // Pattern on foil
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText("★ SCRATCH TO REVEAL ★", 35, 105);

        const btnClaim = document.getElementById("btnClaimScratch");
        if (btnClaim) btnClaim.classList.add("hidden");
    }

    initEvents() {
        const scratchAction = (e) => {
            if (!this.isScratching || this.isRevealed) return;
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            this.ctx.globalCompositeOperation = "destination-out";
            this.ctx.beginPath();
            this.ctx.arc(x, y, 20, 0, 2 * Math.PI);
            this.ctx.fill();

            const btnClaim = document.getElementById("btnClaimScratch");
            if (btnClaim && btnClaim.classList.contains("hidden")) {
                btnClaim.classList.remove("hidden");
            }
        };

        this.canvas.addEventListener("mousedown", () => this.isScratching = true);
        this.canvas.addEventListener("mouseup", () => this.isScratching = false);
        this.canvas.addEventListener("mousemove", scratchAction);

        this.canvas.addEventListener("touchstart", () => this.isScratching = true);
        this.canvas.addEventListener("touchend", () => this.isScratching = false);
        this.canvas.addEventListener("touchmove", scratchAction);
    }
                }
