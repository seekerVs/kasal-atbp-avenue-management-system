// src/layouts/contentManagement/ContentManagement.tsx

import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert, Accordion } from 'react-bootstrap';
import { Book, Image as ImageIcon, CardChecklist, Gear, Star, HandThumbsUp, Save } from 'react-bootstrap-icons';
import axios from 'axios';
import { useNotification } from '../../contexts/NotificationContext';
import { HomePageContent } from "../../types";

// --- TYPE DEFINITIONS ---

const API_URL = 'http://localhost:3001/api';

// This is the list of available icons for the "Features" section.
// It must match the keys in the iconMap in your FeaturesSection.tsx component.
const AVAILABLE_ICONS = ['CartCheck', 'PiggyBank', 'LightningCharge', 'Award'];


function ContentManagement() {
  const { addNotification } = useNotification();
  const [content, setContent] = useState<HomePageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the current content when the component mounts
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/content/home`);
        setContent(response.data);
      } catch (err) {
        setError('Failed to load home page content. Please try again later.');
        addNotification('Failed to load content.', 'danger');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  // Generic handler for nested objects like 'hero' or 'qualityCTA'
  const handleObjectChange = (section: keyof HomePageContent, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContent(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [name]: value,
        },
      };
    });
  };

  // Generic handler for arrays of objects like 'features' or 'services'
  const handleArrayChange = (
    section: 'features' | 'services',
    index: number,
    field: string,
    value: string
  ) => {
    setContent(prev => {
      if (!prev) return null;
      const newArray = [...(prev[section] as any[])];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [section]: newArray };
    });
  };
  
  // Handler for the array of strings in the Quality CTA section
  const handleQualityPointsChange = (index: number, value: string) => {
    setContent(prev => {
        if (!prev) return null;
        const newPoints = [...prev.qualityCTA.points];
        newPoints[index] = value;
        return {
            ...prev,
            qualityCTA: { ...prev.qualityCTA, points: newPoints }
        };
    });
  };

  // Handles saving all changes to the backend
  const handleSave = async () => {
    if (!content) {
      addNotification('No content to save.', 'danger');
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API_URL}/content/home`, content);
      addNotification('Home page content saved successfully!', 'success');
    } catch (err) {
      addNotification('Failed to save content. Please check the console.', 'danger');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Container className="text-center p-5"><Spinner animation="border" /></Container>;
  }

  if (error || !content) {
    return <Container><Alert variant="danger">{error || 'Could not load data.'}</Alert></Container>;
  }

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Home Page Content Management</h2>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner as="span" size="sm" /> : <Save className="me-2" />}
          Save All Changes
        </Button>
      </div>

      <Accordion defaultActiveKey={['0']} alwaysOpen>
        {/* --- Hero Section Form --- */}
        <Accordion.Item eventKey="0">
          <Accordion.Header><ImageIcon className="me-2"/>Hero Section</Accordion.Header>
          <Accordion.Body>
            <Form.Group className="mb-3">
              <Form.Label>Main Title</Form.Label>
              <Form.Control name="title" value={content.hero.title} onChange={(e: any) => handleObjectChange('hero', e)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Search Bar Placeholder</Form.Label>
              <Form.Control name="searchPlaceholder" value={content.hero.searchPlaceholder} onChange={(e: any) => handleObjectChange('hero', e)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Background Image URL</Form.Label>
              <Form.Control name="imageUrl" value={content.hero.imageUrl} onChange={(e: any) => handleObjectChange('hero', e)} />
            </Form.Group>
          </Accordion.Body>
        </Accordion.Item>

        {/* --- Features Section Form --- */}
        <Accordion.Item eventKey="1">
          <Accordion.Header><Star className="me-2"/>Features Section</Accordion.Header>
          <Accordion.Body>
            {content.features.map((feature, index) => (
              <Card key={index} className="mb-3">
                <Card.Header>Feature {index + 1}</Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Icon</Form.Label>
                        <Form.Select value={feature.icon} onChange={(e) => handleArrayChange('features', index, 'icon', e.target.value)}>
                          <option>-- Select an Icon --</option>
                          {AVAILABLE_ICONS.map(iconName => (
                            <option key={iconName} value={iconName}>{iconName}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Title</Form.Label>
                        <Form.Control value={feature.title} onChange={(e) => handleArrayChange('features', index, 'title', e.target.value)} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control as="textarea" rows={2} value={feature.description} onChange={(e) => handleArrayChange('features', index, 'description', e.target.value)} />
                  </Form.Group>
                </Card.Body>
              </Card>
            ))}
          </Accordion.Body>
        </Accordion.Item>

        {/* --- Services Section Form --- */}
        <Accordion.Item eventKey="2">
          <Accordion.Header><Gear className="me-2"/>Services Section</Accordion.Header>
          <Accordion.Body>
            {content.services.map((service, index) => (
               <Card key={index} className="mb-3">
                <Card.Header>Service Card {index + 1}: {service.title}</Card.Header>
                <Card.Body>
                    <Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control value={service.title} onChange={(e) => handleArrayChange('services', index, 'title', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Text</Form.Label><Form.Control as="textarea" rows={2} value={service.text} onChange={(e) => handleArrayChange('services', index, 'text', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Image URL</Form.Label><Form.Control value={service.imageUrl} onChange={(e) => handleArrayChange('services', index, 'imageUrl', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Button Link Path</Form.Label><Form.Control value={service.path} onChange={(e) => handleArrayChange('services', index, 'path', e.target.value)} placeholder="e.g., /products" /></Form.Group>
                </Card.Body>
               </Card>
            ))}
          </Accordion.Body>
        </Accordion.Item>
        
        {/* --- Quality Call-to-Action Form --- */}
        <Accordion.Item eventKey="3">
            <Accordion.Header><HandThumbsUp className="me-2"/>Quality CTA Section</Accordion.Header>
            <Accordion.Body>
                <Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control name="title" value={content.qualityCTA.title} onChange={(e: any) => handleObjectChange('qualityCTA', e)} /></Form.Group>
                <Form.Group className="mb-3"><Form.Label>Button Text</Form.Label><Form.Control name="buttonText" value={content.qualityCTA.buttonText} onChange={(e: any) => handleObjectChange('qualityCTA', e)} /></Form.Group>
                <Form.Group className="mb-3"><Form.Label>Image URL</Form.Label><Form.Control name="imageUrl" value={content.qualityCTA.imageUrl} onChange={(e: any) => handleObjectChange('qualityCTA', e)} /></Form.Group>
                <hr/>
                <h6>Feature Points</h6>
                {content.qualityCTA.points.map((point, index) => (
                    <Form.Group key={index} className="mb-2"><Form.Control value={point} onChange={(e) => handleQualityPointsChange(index, e.target.value)} /></Form.Group>
                ))}
            </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}

export default ContentManagement;