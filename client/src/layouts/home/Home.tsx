// src/layouts/home/Home.tsx
import React, { useState, useEffect } from "react";
import { Container, Spinner } from "react-bootstrap";
import CustomFooter from "../../components/customFooter/CustomFooter";

// Import the new section components
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { ServicesSection } from './ServicesSection';
import { QualityCTASection } from './QualityCTASection';

// The main CSS can be imported here
import "./home.css";
import { HomePageContent } from "../../types";
import api from "../../services/api";

function Home() {
  const [pageContent, setPageContent] = useState<HomePageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Ensure you have this endpoint on your backend
        const response = await api.get('/content/home');
        setPageContent(response.data);
        
      } catch (error) {
        console.log(pageContent);
        console.error("Failed to load home page content", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  // Your type guard is now much more powerful.
  // After this check, TypeScript knows `pageContent` MUST be of type `HomePageContent`.
  if (loading || !pageContent) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Spinner animation="border" />
      </div>
    );
  }

  // --- NO CHANGES NEEDED BELOW THIS LINE ---
  // TypeScript is now happy because it knows `pageContent` is not null here.
  return (
    <Container fluid className="p-0">
      
      <HeroSection data={pageContent.hero} />
      <FeaturesSection data={pageContent.features} />
      <ServicesSection data={pageContent.services} />
      <QualityCTASection data={pageContent.qualityCTA} />
      <footer className="bg-white text-dark py-3">
        <CustomFooter />
      </footer>
    </Container>
  );
}

export default Home;