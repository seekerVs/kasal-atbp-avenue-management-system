import React, { useState, useEffect } from 'react';
import { Image, Form, Button } from 'react-bootstrap';
import { HomeHeroData } from "../../types";
import { useNavigate } from 'react-router-dom';

const PLACEHOLDER_IMAGE = 'https://placehold.co/1920x1080/8B0000/FFFFFF?text=Hero+Image';

interface HeroSectionProps {
  data: HomeHeroData;
}

export function HeroSection({ data }: HeroSectionProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const [imageSrc, setImageSrc] = useState(data.imageUrl || PLACEHOLDER_IMAGE);

  useEffect(() => {
    setImageSrc(data.imageUrl || PLACEHOLDER_IMAGE);
  }, [data.imageUrl]);

  const handleImageError = () => {
    setImageSrc(PLACEHOLDER_IMAGE);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    // Prevent the browser's default form submission (which causes a full page reload)
    e.preventDefault();

    // If the search term is not empty, navigate to the products page
    if (searchTerm.trim()) {
      // Use encodeURIComponent to safely handle spaces and special characters in the URL
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    }
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
            <Form className="hero-search-form d-flex mt-3" onSubmit={handleSearchSubmit}>
              <Form.Control
                type="text"
                placeholder={data.searchPlaceholder ?? 'Dress color, type, or name'}
                className="me-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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