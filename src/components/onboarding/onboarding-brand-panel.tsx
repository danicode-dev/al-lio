"use client";

import Image from "next/image";

export function OnboardingBrandPanel() {
  return (
    <aside className="onboarding-brand-panel" aria-hidden="true">
      <svg
        className="onboarding-kinetic-lines"
        viewBox="0 0 600 800"
        preserveAspectRatio="xMinYMax slice"
        fill="none"
      >
        <g stroke="#E15D2D" strokeWidth="3" strokeLinecap="round" opacity="0.6">
          <line x1="40" y1="780" x2="190" y2="630" />
          <line x1="80" y1="830" x2="270" y2="640" />
        </g>
        <g stroke="#4C7A68" strokeWidth="2.5" strokeLinecap="round" opacity="0.35">
          <line x1="0" y1="690" x2="110" y2="580" />
          <line x1="120" y1="760" x2="300" y2="580" />
        </g>
        <g stroke="#B9B2A0" strokeWidth="2" strokeLinecap="round" opacity="0.35">
          <line x1="-30" y1="640" x2="70" y2="540" />
          <line x1="60" y1="700" x2="230" y2="530" />
          <line x1="150" y1="740" x2="390" y2="500" />
          <line x1="210" y1="800" x2="490" y2="510" />
          <line x1="290" y1="800" x2="530" y2="550" />
        </g>
      </svg>
      <Image
        className="onboarding-brand-logo"
        src="/assets/al_lio_logo_horizontal_transparent.png"
        alt="AL LÍO"
        width={615}
        height={214}
        priority
      />
    </aside>
  );
}
