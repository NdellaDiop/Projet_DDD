import { useState } from "react";

export function WaveLogo({ className }: { className?: string }) {
  const [imgOk, setImgOk] = useState(true);
  const src = "/payment-icons/wave.png";
  if (imgOk) {
    return (
      <img
        src={src}
        alt="Wave"
        className={className}
        onError={() => setImgOk(false)}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="0" y="0" width="64" height="64" rx="16" fill="#3DD5C6" />
      <path
        d="M14 22c0-2.2 1.8-4 4-4h4c2.1 0 3.9 1.7 4 3.8l1.3 18.5c.1 1.4 2.1 1.6 2.5.2l4.7-16.8c.5-1.8 2.1-3 4-3h3.2c1.9 0 3.6 1.2 4 3l4.7 16.8c.4 1.4 2.4 1.2 2.5-.2L54 22.7c.1-2.1 1.9-3.7 4-3.7h.0"
        fill="none"
        stroke="#0B2E2A"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <circle cx="51.5" cy="44.5" r="3.2" fill="#0B2E2A" opacity="0.92" />
    </svg>
  );
}

export function OrangeMoneyLogo({ className }: { className?: string }) {
  const [imgOk, setImgOk] = useState(true);
  const src = "/payment-icons/orange-money.png";
  if (imgOk) {
    return (
      <img
        src={src}
        alt="Orange Money"
        className={className}
        onError={() => setImgOk(false)}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="0" y="0" width="64" height="64" rx="16" fill="#111827" />
      <path d="M22 42V22h7.5c6.8 0 11.5 4.1 11.5 10s-4.7 10-11.5 10H22Z" fill="#F97316" />
      <path
        d="M30.8 28.4h-3.2v7.2h3.2c2.7 0 4.6-1.5 4.6-3.6s-1.9-3.6-4.6-3.6Z"
        fill="#111827"
        opacity="0.85"
      />
      <path
        d="M44 20h-6.5c-.9 0-1.4 1-.8 1.7l2.4 2.7c-7.7 3.2-13.6 9.2-16.4 16.8-.3.9.6 1.8 1.5 1.4 7.2-2.7 13-8.5 15.7-15.7l2.4 2.7c.6.7 1.7.3 1.7-.7V20Z"
        fill="#F97316"
        opacity="0.95"
      />
      <text x="10" y="57" fontSize="9" fill="#F97316" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
        Orange Money
      </text>
    </svg>
  );
}
