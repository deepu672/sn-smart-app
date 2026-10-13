/* ==========================================================================
   SN SMART - LUCKY WHEEL ENGINE (ADMOB REWARDED INTEGRATION)
   ========================================================================== */

class LuckyWheelEngine {
    constructor() {
        this.canvas = document.getElementById("wheelCanvas");
        this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
        this.currentAngle = 0;
        this.isSpinning = false;
        this.slices = APP_CONFIG.spinSlices;

        if (this.canvas) this.drawWheel();
    }

    drawWheel() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const total = this.slices.length;
        const arc = (2 * Math.PI) / total;

        ctx.clearRect(0, 0, 320, 320);

        this.slices.forEach((slice, i) => {
            const angle = i * arc;
            ctx.beginPath();
            ctx.fillStyle = slice.color;
            ctx.moveTo(160, 160);
            ctx.arc(160, 160, 150, angle, angle + arc);
            ctx.lineTo(160, 160);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Text Label
            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
            ctx.translate(160 + Math.cos(angle + arc / 2) * 105, 160 + Math.sin(angle + arc / 2) * 105);
            ctx.rotate(angle + arc / 2 + Math.PI / 2);
            ctx.fillText(slice.label, -ctx.measureText(slice.label).width / 2, 0);
            ctx.restore();
        });
    }

    spin(callback) {
        if (this.isSpinning) return;
        this.isSpinning = true;

        const winIndex = Math.floor(Math.random() * this.slices.length);
        const arcDeg = 360 / this.slices.length;
        // Pointer is at the top (270 degrees)
        const targetSliceAngle = 360 - (winIndex * arcDeg + arcDeg / 2);
        const fullSpins = (Math.floor(Math.random() * 3) + 5) * 360;
        const finalAngle = this.currentAngle + fullSpins + (targetSliceAngle - (this.currentAngle % 360));

        this.currentAngle = finalAngle;
        this.canvas.style.transition = "transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)";
        this.canvas.style.transform = `rotate(${this.currentAngle}deg)`;

        setTimeout(() => {
            this.isSpinning = false;
            if (callback) callback(this.slices[winIndex]);
        }, 4100);
    }
  }
                         
