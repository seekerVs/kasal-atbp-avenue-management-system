// src/layouts/about/About.tsx

import { useState, useEffect } from "react";
import { Container, Alert, Spinner } from "react-bootstrap";
import api from "../../services/api"; // Use the centralized API service
import { AboutPageData } from "../../types";

// Import your new section components
import { HeroSection } from './HeroSection';
import { WelcomeSection } from './WelcomeSection';
import { HistorySection } from './HistorySection';
import { FeaturesSection } from './FeaturesSection';
import { NewsletterSection } from './NewsletterSection';
import { Coat_display, Dress_display } from "../../assets/images";
import "./about.css";
import { FaqSection } from "./FaqSection";

function About() {
  const [pageContent, setPageContent] = useState<AboutPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/content/about');
        
        const data = response.data;
        if (data.hero.imageUrl === '/images/displays/coat-display.jpg') {
          data.hero.imageUrl = Coat_display;
        }
        if (data.history.imageUrl === '/images/displays/dress-display.jpg') {
          data.history.imageUrl = Dress_display;
        }
        setPageContent(data);
      } catch (err) {
        setError("Failed to load page content. Please try again later.");
        console.error("Error fetching 'about' page content:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAboutContent();
  }, []);

  if (loading) {
    return <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}><Spinner animation="border" /></Container>;
  }
  if (error) {
    return <Container className="pt-5"><Alert variant="danger">{error}</Alert></Container>;
  }
  if (!pageContent) {
    return <Container className="pt-5"><Alert variant="warning">Page content could not be loaded.</Alert></Container>;
  }

  return (
    <Container fluid className="about-page-container">
      
      {/* The parent component now just composes the sections, passing data down */}
      <HeroSection data={pageContent.hero} />
      <WelcomeSection data={pageContent.welcome} />
      <HistorySection data={pageContent.history} />
      <FeaturesSection data={pageContent.features} />
      {pageContent.faq && pageContent.faq.length > 0 && (
        <FaqSection data={pageContent.faq} />
      )}
      <NewsletterSection data={pageContent.newsletter} />
    </Container>
  );
}

export default About;