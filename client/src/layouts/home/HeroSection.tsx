// src/layouts/home/HeroSection.tsx

import React, { useState, useEffect } from 'react';
import { Image, Form, Button } from 'react-bootstrap';
import OutfitRecommendationModal from '../../components/modals/outfitRecommendationModal/OutfitRecommendationModal';
import CustomButton1 from '../../components/customButton1/CustomButton1';
import { HomeHeroData } from "../../types";

const PLACEHOLDER_IMAGE = 'https://placehold.co/1920x1080/8B0000/FFFFFF?text=Hero+Image';


interface HeroSectionProps {
  data: HomeHeroData;
}

export function HeroSection({ data }: HeroSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const [imageSrc, setImageSrc] = useState(data.imageUrl || PLACEHOLDER_IMAGE);

  useEffect(() => {
    setImageSrc(data.imageUrl || PLACEHOLDER_IMAGE);
  }, [data.imageUrl]);

  const handleImageError = () => {
    setImageSrc(PLACEHOLDER_IMAGE);
  };

  return (
    <>
      <OutfitRecommendationModal
        show={showModal}
        onHide={() => setShowModal(false)}
        values={formValues}
        onChange={(field, value) =>
          setFormValues((prev) => ({ ...prev, [field]: value }))
        }
        onRecommend={() => console.log('recommend clicked', formValues)}
      />

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
                // --- BONUS FIX: Use the dynamic placeholder from props ---
                placeholder={data.searchPlaceholder ?? 'Dress color, type, or name'}
                className="me-2"
              />
              <Button type="submit" variant="light">
                Search
              </Button>
            </Form>
          </div>

          <div className="mt-4" onClick={() => setShowModal(true)}>
            <CustomButton1 />
          </div>
        </div>
      </section>
    </>
  );
}