// src/layouts/home/QualityCTASection.tsx

import  { useState, useEffect } from 'react';
import { Button, Image } from 'react-bootstrap';
import { CheckCircleFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

const PLACEHOLDER_IMAGE = 'https://placehold.co/800x600/f8f9fa/343a40?text=Image+Not+Available';


interface QualityCTAData {
  title: string;
  points: string[];
  buttonText: string;
  imageUrl: string;
}

interface QualityCTASectionProps {
  data: QualityCTAData;
}

export function QualityCTASection({ data }: QualityCTASectionProps) {
  const navigate = useNavigate();

  const [imageSrc, setImageSrc] = useState(data.imageUrl || PLACEHOLDER_IMAGE);

  useEffect(() => {
    setImageSrc(data.imageUrl || PLACEHOLDER_IMAGE);
  }, [data.imageUrl]); // This effect re-runs only when the imageUrl prop changes.

  const handleImageError = () => {
    setImageSrc(PLACEHOLDER_IMAGE);
  };

  const handleOrderNowClick = () => {
    navigate('/products');
  };

  return (
    <section className="quality-cta-section">
      <div className="quality-cta-content">
        <div className="quality-cta-text">
          <h2>{data.title}</h2>
          {data.points.map((point, index) => (
            <div key={index} className="quality-point">
              <CheckCircleFill className="quality-point-icon" />
              <span>{point}</span>
            </div>
          ))}
          <Button 
            variant="light" 
            className="mt-4 cta-button" 
            onClick={handleOrderNowClick}
          >
            {data.buttonText}
          </Button>
        </div>

        <div className="quality-cta-image-wrapper">
          
          <Image
            src={imageSrc}
            alt={data.title || "A collection of high-quality hanging clothes"}
            fluid 
            onError={handleImageError}
          />
        </div>
      </div>
    </section>
  );
}