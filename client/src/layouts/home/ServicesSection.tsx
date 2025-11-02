import { useState, useEffect } from 'react';
import { Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ServiceData } from '../../types';

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/6c757d/FFFFFF?text=Service+Image';

// --- THIS IS THE FIX ---
// Create a static mapping from the service TITLE to its hardcoded path.
// This relies on the title from the CMS being stable.
const SERVICE_PATHS: { [key: string]: string } = {
  'Outfit Rentals': '/products',
  'Packages': '/packages',
  'Custom Outfit': '/custom-tailoring',
};

interface ServiceCardProps {
  service: ServiceData;
}

function ServiceCard({ service }: ServiceCardProps) {
  const navigate = useNavigate();
  const [imageSrc, setImageSrc] = useState(service.imageUrl || PLACEHOLDER_IMAGE);

  useEffect(() => {
    setImageSrc(service.imageUrl || PLACEHOLDER_IMAGE);
  }, [service.imageUrl]);

  const handleImageError = () => {
    setImageSrc(PLACEHOLDER_IMAGE);
  };

  // Look up the correct path from our static map using the service's title.
  // Default to the home page '/' if a title doesn't match, as a safe fallback.
  const destinationPath = SERVICE_PATHS[service.title] || '/';

  return (
    <Card className="service-card">
      <Card.Img 
        variant="top" 
        src={imageSrc} 
        alt={`Image for ${service.title} service`} 
        className="service-card-img"
        onError={handleImageError}
      />
      <Card.Body className="d-flex flex-column">
        <Card.Title className="fw-bold">{service.title}</Card.Title>
        <Card.Text className="text-muted">{service.text}</Card.Text>
        <Button
          variant="primary"
          className="mt-auto align-self-end"
          // Use the path looked up from our static map
          onClick={() => navigate(destinationPath)}
        >
          See More
        </Button>
      </Card.Body>
    </Card>
  );
}

// --- Main Section Component (no changes needed here) ---
interface ServicesSectionProps {
  data: ServiceData[];
}

export function ServicesSection({ data }: ServicesSectionProps) {
  return (
    <section className="services-section">
      <div className="services-grid">
        {data.map((service) => (
          <ServiceCard key={service.title} service={service} />
        ))}
      </div>
    </section>
  );
}