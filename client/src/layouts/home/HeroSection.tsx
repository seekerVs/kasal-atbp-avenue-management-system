import React, { useState, useEffect } from 'react';
import { Image, Form, Button } from 'react-bootstrap';
import { HomeHeroData } from "../../types";

const PLACEHOLDER_IMAGE = 'https://placehold.co/1920x1080/8B0000/FFFFFF?text=Hero+Image';

interface HeroSectionProps {
  data: HomeHeroData;
}

export function HeroSection({ data }: HeroSectionProps) {
  const [imageSrc, setImageSrc] = useState(data.imageUrl || PLACEHOLDER_IMAGE);

  useEffect(() => {
    setImageSrc(data.imageUrl || PLACEHOLDER_IMAGE);
  }, [data.imageUrl]);

  const handleImageError = () => {
    setImageSrc(PLACEHOLDER_IMAGE);
  };
  
  return (
    <>
      <section className="hero-section position-relative overflow-hidden">
        <Image
          src={imageSrc}
          alt={data.title ?? 'Hero Banner'}
          className="hero-image"
          onError={handleImageError}
        />
        <div className="hero-content position-absolute top-50 start-50 translate-middle">
          <div className="hero-text-box text-center">
            <h1 className="text-white">{data.title ?? 'Find your perfect outfit'}</h1>
            <Form className="hero-search-form d-flex mt-3">
              <Form.Control
                type="text"
                placeholder={data.searchPlaceholder ?? 'Dress color, type, or name'}
                className="me-2"
              />
              <Button type="submit" variant="light">
                Search
              </Button>
            </Form>
          </div>
        </div>
      </section>
    </>
  );
}