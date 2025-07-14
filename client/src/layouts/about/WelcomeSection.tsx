import React from 'react';
import { WelcomeData } from '../../types'; 

interface WelcomeSectionProps {
  data: WelcomeData;
}

export function WelcomeSection({ data }: WelcomeSectionProps) {
  return (
    <section className="welcome-section text-center">
      <h1 className="fw-medium display-5">{data.heading}</h1>
      <p>{data.paragraph}</p>
    </section>
  );
}