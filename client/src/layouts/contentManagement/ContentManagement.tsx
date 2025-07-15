// src/layouts/contentManagement/ContentManagement.tsx

import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert, Accordion, Nav } from 'react-bootstrap';
import { Book, Image as ImageIcon, CardChecklist, Gear, Star, HandThumbsUp, Save, QuestionCircle, Trash, PlusCircle } from 'react-bootstrap-icons';
import api from '../../services/api';

import { HomePageContent, AboutPageData } from "../../types"; // Import all needed types
import { ImageDropzone } from '../../components/imageDropzone/ImageDropzone';
import { ComponentPreview } from '../../components/componentPreview/ComponentPreview';
import Home from '../home/Home';
import About from '../about/About';
import { IconPicker } from '../../components/iconPicker/IconPicker';
import { useAlert } from '../../contexts/AlertContext';

function ContentManagement() {
  const { addAlert } = useAlert();

  // --- 1. STATE MANAGEMENT ---
  const [activePage, setActivePage] = useState<'home' | 'about'>('home');
  const [homeContent, setHomeContent] = useState<HomePageContent | null>(null);
  const [aboutContent, setAboutContent] = useState<AboutPageData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>('0');

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    const fetchAllContent = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch both pages' content in parallel for efficiency
        const [homeResponse, aboutResponse] = await Promise.all([
          api.get('/content/home'),
          api.get('/content/about')
        ]);
        setHomeContent(homeResponse.data);
        setAboutContent(aboutResponse.data);
      } catch (err) {
        const errorMessage = 'Failed to load page content. Please try again later.';
        setError(errorMessage);
        // --- FIX: Call with separate arguments in the correct order ---
        addAlert(errorMessage, 'danger');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllContent();
  }, [addAlert]);


  // --- 3. GENERIC CHANGE HANDLERS ---
  // In ContentManagement.tsx
  // --- HOME PAGE HANDLERS ---
  const handleHomeFieldChange = (section: keyof HomePageContent, field: string, value: string) => {
      setHomeContent(prev => {
          if (!prev) return null;
          return {
              ...prev,
              [section]: {
                  ...(prev as any)[section],
                  [field]: value,
              },
          };
      });
  };

  const handleHomeArrayChange = (section: 'features' | 'services', index: number, field: string, value: string) => {
      setHomeContent(prev => {
          if (!prev) return null;
          const newArray = [...(prev as any)[section]];
          newArray[index] = { ...newArray[index], [field]: value };
          return { ...prev, [section]: newArray };
      });
  };

  const handleHomeImageUpload = (section: 'hero' | 'services' | 'qualityCTA', newImageUrl: string, index: number | null = null) => {
      setHomeContent(prev => {
          if (!prev) return null;
          if (index !== null && Array.isArray((prev as any)[section])) {
              const newArray = [...(prev as any)[section]];
              newArray[index] = { ...newArray[index], imageUrl: newImageUrl };
              return { ...prev, [section]: newArray };
          }
          return { ...prev, [section]: { ...(prev as any)[section], imageUrl: newImageUrl }};
      });
      addAlert(
        'Image has been uploaded and is ready to be saved.',
        'success'
      );
  };


  // --- ABOUT PAGE HANDLERS ---
  const handleAboutFieldChange = (section: keyof AboutPageData, field: string, value: string) => {
      setAboutContent(prev => {
          if (!prev) return null;
          return {
              ...prev,
              [section]: {
                  ...(prev as any)[section],
                  [field]: value,
              },
          };
      });
  };

  const handleAboutArrayChange = (section: 'features' | 'faq', index: number, field: string, value: string) => {
      setAboutContent(prev => {
          if (!prev) return null;
          const newArray = [...(prev as any)[section]];
          newArray[index] = { ...newArray[index], [field]: value };
          return { ...prev, [section]: newArray };
      });
  };

  const handleAboutImageUpload = (section: 'hero' | 'history', newImageUrl: string) => {
      setAboutContent(prev => {
          if (!prev) return null;
          return { ...prev, [section]: { ...(prev as any)[section], imageUrl: newImageUrl }};
      });
      addAlert(
        'Image has been uploaded and is ready to be saved.',
        'success'
      );
  };

  const handleAddFaq = () => {
      setAboutContent(prev => {
          if (!prev) return null;
          const newFaqs = [...prev.faq, { question: '', answer: '' }];
          return { ...prev, faq: newFaqs };
      });
  };

  const handleRemoveFaq = (index: number) => {
    const questionToDelete = aboutContent?.faq[index]?.question;
    setAboutContent(prev => {
        if (!prev) return null;
        const newFaqs = prev.faq.filter((_, i) => i !== index);
        return { ...prev, faq: newFaqs };
    });
    addAlert(
      `Successfully removed the question: "${questionToDelete || 'FAQ Item'}"`,
      'info'
    );
  };

  const handleAccordionSelect = (eventKey: any) => {
    // The nullish coalescing operator '??' ensures that if eventKey is
    // null or undefined, we pass `null` to the state setter.
    // Otherwise, we pass the string value. This satisfies the type requirements.
    setActiveKey(eventKey ?? null);
};

  // --- 4. SAVE HANDLER ---
  const handleSave = async () => {
    const isHomePage = activePage === 'home';
    const contentToSave = isHomePage ? homeContent : aboutContent;
    const endpoint = `/content/${activePage}`;
    const pageName = isHomePage ? 'Home' : 'About Us';

    if (!contentToSave) {
      addAlert(
        `There is no content loaded for the ${pageName} page.`,
        'danger'
      );
      return;
    }
    setSaving(true);
    try {
      await api.put(endpoint, contentToSave);
      setPreviewVersion(prev => prev + 1);
      addAlert(
        `The ${pageName} page content has been updated.`,
        'success'
      );
    } catch (err) {
      addAlert(
        `There was an error saving the ${pageName} page. Please check the console for details.`,
        'danger'
      );
      console.error(err);
    } finally {
      setSaving(false);
    }
  };


  // --- 5. RENDER LOGIC ---
  if (loading) {
    return <Container className="text-center p-5"><Spinner animation="border" /></Container>;
  }

  if (error) {
    return <Container><Alert variant="danger">{error}</Alert></Container>;
  }

  return (
    <Container fluid className="d-flex flex-column" style={{ height: '100%' }}>
      <Row className="flex-grow-1" style={{ minHeight: 0 }}>
        {/* === LEFT COLUMN: FORMS (takes up 5/12 of the width on large screens) === */}
        <Col lg={5} className="d-flex flex-column h-100">
        
          {/* All of your existing header, Nav, and Accordion code goes here.
              I have included it for you. */}

          <div className="d-flex justify-content-between align-items-center mb-4" style={{ flexShrink: 0 }}>
            <h2>Page Content Management</h2>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner as="span" size="sm" /> : <Save className="me-2" />}
                Save {activePage === 'home' ? 'Home Page' : 'About Page'}
            </Button>
          </div>  

          <Nav variant="tabs" activeKey={activePage} onSelect={(k) => setActivePage(k as 'home' | 'about')} className="mb-3" style={{ flexShrink: 0 }}>
            <Nav.Item><Nav.Link eventKey="home">Home Page</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="about">About Us Page</Nav.Link></Nav.Item>
          </Nav>
          
          <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '1rem' }}>
            {/* Home Page Forms */}
            {activePage === 'home' && homeContent && (
              <Accordion onSelect={handleAccordionSelect}>
                {/* Paste your existing Home Page Accordion.Items here */}
                <Accordion.Item eventKey="0">
                  <Accordion.Header><ImageIcon className="me-2"/>Hero Section</Accordion.Header>
                  <Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Main Title</Form.Label><Form.Control value={homeContent.hero.title} onChange={(e) => handleHomeFieldChange('hero', 'title', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Search Bar Placeholder</Form.Label><Form.Control value={homeContent.hero.searchPlaceholder} onChange={(e) => handleHomeFieldChange('hero', 'searchPlaceholder', e.target.value)} /></Form.Group>
                    <ImageDropzone label="Background Image" currentImageUrl={homeContent.hero.imageUrl} onUploadSuccess={(newUrl) => handleHomeImageUpload('hero', newUrl)} />
                  </Accordion.Body>
                </Accordion.Item>
                {/* --- Home Page Features Section Form --- */}
                <Accordion.Item eventKey="1">
                  <Accordion.Header><Star className="me-2"/>Features Section</Accordion.Header>
                  <Accordion.Body>
                    {homeContent.features.map((feature, index) => (
                      <Card key={index} className="mb-3"><Card.Header>Feature {index + 1}</Card.Header><Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Icon</Form.Label>
                              <IconPicker
                                value={feature.icon}
                                onChange={(iconName) => handleHomeArrayChange('features', index, 'icon', iconName)}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}><Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control value={feature.title} onChange={(e) => handleHomeArrayChange('features', index, 'title', e.target.value)} /></Form.Group></Col>
                        </Row>
                        <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={feature.description} onChange={(e) => handleHomeArrayChange('features', index, 'description', e.target.value)} /></Form.Group>
                      </Card.Body></Card>
                    ))}
                  </Accordion.Body>
                </Accordion.Item>
                {/* --- Services Section Form --- */}
                  <Accordion.Item eventKey="2">
                    <Accordion.Header><Gear className="me-2"/>Services Section</Accordion.Header>
                    <Accordion.Body>
                      {homeContent.services.map((service, index) => (
                        <Card key={index} className="mb-3">
                          <Card.Header>Service Card {index + 1}: {service.title}</Card.Header>
                          <Card.Body>
                            <Form.Group className="mb-3">
                              <Form.Label>Title</Form.Label>
                              <Form.Control 
                                value={service.title} 
                                onChange={(e) => handleHomeArrayChange('services', index, 'title', e.target.value)} 
                              />
                            </Form.Group>
                            <Form.Group className="mb-3">
                              <Form.Label>Text</Form.Label>
                              <Form.Control 
                                as="textarea" 
                                rows={2} 
                                value={service.text} 
                                onChange={(e) => handleHomeArrayChange('services', index, 'text', e.target.value)} 
                              />
                            </Form.Group>
                            <ImageDropzone 
                              label="Service Image"
                              currentImageUrl={service.imageUrl}
                              onUploadSuccess={(newUrl) => handleHomeImageUpload('services', newUrl, index)}
                            />
                          </Card.Body>
                        </Card>
                      ))}
                    </Accordion.Body>
                  </Accordion.Item>

                  {/* --- Quality Call-to-Action Form --- */}
                  <Accordion.Item eventKey="3">
                      <Accordion.Header><HandThumbsUp className="me-2"/>Quality CTA Section</Accordion.Header>
                      <Accordion.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Title</Form.Label>
                            <Form.Control 
                              value={homeContent.qualityCTA.title} 
                              onChange={(e) => handleHomeFieldChange('qualityCTA', 'title', e.target.value)} 
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>Button Text</Form.Label>
                            <Form.Control 
                              value={homeContent.qualityCTA.buttonText} 
                              onChange={(e) => handleHomeFieldChange('qualityCTA', 'buttonText', e.target.value)} 
                            />
                          </Form.Group>
                          <ImageDropzone  
                            label="Section Image"
                            currentImageUrl={homeContent.qualityCTA.imageUrl}
                            onUploadSuccess={(newUrl) => handleHomeImageUpload('qualityCTA', newUrl)}
                          />
                          <hr/>
                          <h6>Feature Points</h6>
                          {homeContent.qualityCTA.points.map((point, index) => (
                              <Form.Group key={index} className="mb-2">
                                <Form.Control 
                                  value={point} 
                                  onChange={(e) => {
                                    // Special handler for the simple array of strings
                                    setHomeContent(prev => {
                                      if (!prev) return null;
                                      const newPoints = [...prev.qualityCTA.points];
                                      newPoints[index] = e.target.value;
                                      return {
                                        ...prev,
                                        qualityCTA: { ...prev.qualityCTA, points: newPoints }
                                      };
                                    });
                                  }} 
                                />
                              </Form.Group>
                          ))}
                      </Accordion.Body>
                  </Accordion.Item>
              </Accordion>
            )}

            {/* About Page Forms */}
            {activePage === 'about' && aboutContent && (
              <Accordion onSelect={handleAccordionSelect}>
                {/* --- About Page Hero Section --- */}
                <Accordion.Item eventKey="0"><Accordion.Header><ImageIcon className="me-2"/>Hero Section</Accordion.Header><Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Alternative Text for Image</Form.Label><Form.Control value={aboutContent.hero.altText} onChange={(e) => handleAboutFieldChange('hero', 'altText', e.target.value)} /></Form.Group>
                    <ImageDropzone label="Background Image" currentImageUrl={aboutContent.hero.imageUrl} onUploadSuccess={(newUrl) => handleAboutImageUpload('hero', newUrl)} />
                  </Accordion.Body></Accordion.Item>
                  {/* --- About Page Welcome Section --- */}
                  <Accordion.Item eventKey="1"><Accordion.Header><Book className="me-2"/>Welcome Section</Accordion.Header><Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Heading</Form.Label><Form.Control value={aboutContent.welcome.heading} onChange={(e) => handleAboutFieldChange('welcome', 'heading', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Paragraph</Form.Label><Form.Control as="textarea" rows={4} value={aboutContent.welcome.paragraph} onChange={(e) => handleAboutFieldChange('welcome', 'paragraph', e.target.value)} /></Form.Group>
                  </Accordion.Body></Accordion.Item>
                  {/* --- About Page History Section --- */}
                  <Accordion.Item eventKey="2"><Accordion.Header><CardChecklist className="me-2"/>History Section</Accordion.Header><Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Paragraph</Form.Label><Form.Control as="textarea" rows={4} value={aboutContent.history.paragraph} onChange={(e) => handleAboutFieldChange('history', 'paragraph', e.target.value)} /></Form.Group>
                    <ImageDropzone label="Section Image" currentImageUrl={aboutContent.history.imageUrl} onUploadSuccess={(newUrl) => handleAboutImageUpload('history', newUrl)} />
                  </Accordion.Body></Accordion.Item>
                  {/* --- About Page Features Section --- */}
                  <Accordion.Item eventKey="3"><Accordion.Header><Star className="me-2"/>Features Section</Accordion.Header><Accordion.Body>
                      {aboutContent.features.map((feature, index) => (
                        <Card key={index} className="mb-3"><Card.Header>Feature {index + 1}</Card.Header><Card.Body>
                          <Row>
                            <Col md={6}><Form.Group className="mb-3">
                                <Form.Label>Icon</Form.Label>
                                <IconPicker
                                  value={feature.icon}
                                  onChange={(iconName) => handleAboutArrayChange('features', index, 'icon', iconName)}
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}><Form.Group className="mb-3"><Form.Label>Heading</Form.Label><Form.Control value={feature.heading} onChange={(e) => handleAboutArrayChange('features', index, 'heading', e.target.value)} /></Form.Group></Col>
                          </Row>
                          <Form.Group><Form.Label>Text</Form.Label><Form.Control as="textarea" rows={2} value={feature.text} onChange={(e) => handleAboutArrayChange('features', index, 'text', e.target.value)} /></Form.Group>
                        </Card.Body></Card>
                      ))}
                    </Accordion.Body></Accordion.Item>
                  {/* --- About Page FAQ Section --- */}
                  <Accordion.Item eventKey="4"><Accordion.Header><QuestionCircle className="me-2"/>FAQ Section</Accordion.Header><Accordion.Body>
                    {aboutContent.faq.map((faq, index) => (
                      <Card key={index} className="mb-3"><Card.Header className="d-flex justify-content-between align-items-center">FAQ {index + 1}<Button variant="outline-danger" size="sm" onClick={() => handleRemoveFaq(index)}><Trash /></Button></Card.Header><Card.Body>
                        <Form.Group className="mb-2"><Form.Label>Question</Form.Label><Form.Control value={faq.question} onChange={(e) => handleAboutArrayChange('faq', index, 'question', e.target.value)} /></Form.Group>
                        <Form.Group><Form.Label>Answer</Form.Label><Form.Control as="textarea" rows={3} value={faq.answer} onChange={(e) => handleAboutArrayChange('faq', index, 'answer', e.target.value)} /></Form.Group>
                      </Card.Body></Card>
                    ))}
                    <Button variant="outline-primary" size="sm" onClick={handleAddFaq}><PlusCircle className="me-2" />Add FAQ</Button>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}
          </div>
        </Col>

        {/* === RIGHT COLUMN: PREVIEW (takes up 7/12 of the width on large screens) === */}
        <Col lg={7} className="d-flex flex-column h-100">
          <ComponentPreview title="Live Page Preview">
            {activePage === 'home' ? (
              // The `key` prop forces a re-mount when its value changes
              <Home key={`home-preview-${previewVersion}`} />
            ) : (
              <About key={`about-preview-${previewVersion}`} />
            )}
          </ComponentPreview>
        </Col>
      </Row>
    </Container>
  );
}

export default ContentManagement;