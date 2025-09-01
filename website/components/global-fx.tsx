"use client"

export function GlobalFX() {
  return (
    <style jsx global>{`
      :root {
        --color-quirk-bg: #fceed1;
        --color-quirk-primary: #7d3cff; /* Purple-y */
        --color-quirk-yellow: #f2d53c;
        --color-quirk-electric-red: #ff0028;
        --color-quirk-green: #beef00;
        --color-quirk-blue: #1400c6;
        --color-quirk-pinky: #fbe3e8;
        --color-quirk-blue-greeny: #5cbdb9;
        --color-quirk-teeny-greeny: #ebf6f5;
      }

      body {
        background: var(--color-quirk-bg);
      }

      /* Subtle multi-radial gradient using accent colors */
      .quirk-gradient {
        background:
          radial-gradient(120% 120% at 10% 10%, var(--color-quirk-pinky) 0%, transparent 45%),
          radial-gradient(120% 120% at 90% 20%, var(--color-quirk-blue-greeny) 0%, transparent 45%),
          radial-gradient(120% 120% at 50% 90%, var(--color-quirk-yellow) 0%, transparent 45%);
      }

      /* Neon glow button */
      .btn-glow {
        box-shadow: 0 0 0 rgba(125, 60, 255, 0);
        transition: box-shadow 0.2s ease, transform 0.15s ease;
      }
      .btn-glow--primary {
        background: var(--color-quirk-primary);
        color: white;
        text-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
      }
      .btn-glow--primary:hover {
        box-shadow: 0 0 18px rgba(125, 60, 255, 0.55),
          0 0 40px rgba(20, 0, 198, 0.3);
      }
      .btn-glow:active {
        transform: translateY(1px) scale(0.99);
      }

      /* Slide-in list items */
      @keyframes slide-in-up {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .slide-in-up { animation: slide-in-up .35s ease both; }

      /* QR bounce reveal */
      @keyframes bounce-in {
        0% { opacity: 0; transform: scale(0.85); }
        60% { opacity: 1; transform: scale(1.04); }
        100% { transform: scale(1); }
      }
      .qr-bounce { animation: bounce-in .45s cubic-bezier(.2,.8,.2,1) both; }

      /* Mobile-only wrapper (force phone width) */
      .mobile-page {
        min-height: 100dvh;
        padding: 10px;
        display: flex;
        flex-direction: column;
        width: 100%;
      }
    `}</style>
  )
}
