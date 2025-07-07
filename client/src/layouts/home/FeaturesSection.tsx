// src/layouts/home/FeaturesSection.tsx

import React from 'react';
import * as icons from 'react-bootstrap-icons';
import { FeatureData } from "../../types";

interface FeaturesSectionProps {
  data: FeatureData[];
}

export function FeaturesSection({ data }: FeaturesSectionProps) {
  return (
    <section className="features-section">
      <div className="features-grid">
        {data.map((feature, index) => {
          const FeatureIcon = icons[feature.icon as keyof typeof icons];
          
          return (
            <div key={index} className="feature-item">
              {FeatureIcon ? (
                <FeatureIcon className="display-4" />
              ) : (
                // Optional: Render a fallback if the icon name from the DB is invalid
                <icons.QuestionCircle className="display-4 text-muted" />
              )}
              
              <h5>{feature.title}</h5>
              <p className="text-muted">{feature.description}</p>
            </div>
          );
        })}
      </div>
      <hr className="mt-2" />
    </section>
  );
}