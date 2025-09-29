// client/src/layouts/customTailoring/CustomTailoring.tsx

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Image, Spinner, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { CustomTailoringPageContent } from '../../types';
import './customTailoring.css';

function CustomTailoring() {
  const navigate = useNavigate();
  const [content, setContent] = useState<CustomTailoringPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/content/custom-tailoring');
        setContent(response.data);
      } catch (err) {
        setError('Could not load page content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  if (loading) return <div className="text-center py-5"><Spinner /></div>;
  if (error) return <Alert variant="danger" className="m-5 text-center">{error}</Alert>;
  if (!content) return <Alert variant="info" className="m-5 text-center">Page content is not available.</Alert>;

  return (
    <>
      {/* --- NEW WRAPPER: A fluid container with a light background --- */}
      <Container fluid className="py-5">
        <Row className="justify-content-center">
          <Col lg={11} xl={10}>
            {/* --- NEW: The main content is now inside a single Card --- */}
            <Card className="shadow-sm">
              <Card.Body className="p-4 p-md-5">
                
                {/* The two-column layout now lives inside the card */}
                <Row className="g-5 align-items-center">
                  {/* --- LEFT COLUMN: HEADING & CALL TO ACTION --- */}
                  <Col lg={5}>
                    <div className="pe-lg-5">
                      <h1 className="display-4 fw-bold lh-1">{content.heading}</h1>
                      <p className="lead text-muted my-4">{content.subheading}</p>
                      <Button
                        variant="danger"
                        size="lg"
                        onClick={() => navigate('/appointments/new')}
                        className="px-4 py-2"
                      >
                        {content.buttonText}
                      </Button>
                    </div>
                  </Col>

                  {/* --- RIGHT COLUMN: IMAGE GALLERY --- */}
                  <Col lg={7}>
                    {content.galleryImages && content.galleryImages.length > 0 ? (
                      <Row xs={2} sm={3} className="g-3">
                        {content.galleryImages.slice(0, 6).map((img, index) => (
                          <Col key={index}>
                            <div className="gallery-item">
                              <Image src={img.imageUrl} alt={img.altText} className="gallery-image" />
                              {/* <p className="gallery-caption">{img.altText}</p> */}
                            </div>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <p className="text-center text-muted">Gallery images are coming soon.</p>
                    )}
                  </Col>
                </Row>

              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default CustomTailoring;