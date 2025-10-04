// src/layouts/contentManagement/ContentManagement.tsx

import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert, Accordion, Nav } from 'react-bootstrap';
import { Book, Image as ImageIcon, CardChecklist, Gear, Star, HandThumbsUp, Save, QuestionCircle, Trash, PlusCircle, EyeSlash, Eye } from 'react-bootstrap-icons';
import api from '../../services/api';
import { uploadFile } from '../../services/api'; 

import { HomePageContent, AboutPageData, CustomTailoringPageContent } from "../../types"; // Import all needed types
import { ImageDropzone } from '../../components/imageDropzone/ImageDropzone';
import { ComponentPreview } from '../../components/componentPreview/ComponentPreview';
import Home from '../home/Home';
import About from '../about/About';
import CustomTailoring from '../customTailoring/CustomTailoring';
import { IconPicker } from '../../components/iconPicker/IconPicker';
import { useAlert } from '../../contexts/AlertContext';

interface CmsImageUploaderProps {
  label: string;
  currentImage: string;
  onUploadSuccess: (newUrl: string) => void;
}

const CmsImageUploader: React.FC<CmsImageUploaderProps> = ({ label, currentImage, onUploadSuccess }) => {
  const { addAlert } = useAlert();
  const [stagedFile, setStagedFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      // If the user removes the image, we might want to handle this differently,
      // for now we'll just clear the stage. A null URL could be an "empty" state.
      onUploadSuccess(''); // Pass an empty string to signify removal
      setStagedFile(null);
      return;
    }

    setStagedFile(file);
    try {
      addAlert('Uploading image...', 'info');
      const newUrl = await uploadFile(file);
      onUploadSuccess(newUrl); // Call the parent's final success handler
    } catch (error) {
      addAlert('Image upload failed. Please try again.', 'danger');
      setStagedFile(null); // Clear the failed file
    }
  };

  // The component decides whether to show the existing URL or the newly staged file preview
  const displayImage = stagedFile || currentImage;

  return (
    <ImageDropzone
      label={label}
      currentImage={displayImage}
      onFileSelect={handleFileSelect}
    />
  );
};

function ContentManagement() {
  const { addAlert } = useAlert();

  // --- 1. STATE MANAGEMENT ---
  const [activePage, setActivePage] = useState<'home' | 'about' | 'custom-tailoring'>('home');
  const [homeContent, setHomeContent] = useState<HomePageContent | null>(null);
  const [aboutContent, setAboutContent] = useState<AboutPageData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [customContent, setCustomContent] = useState<CustomTailoringPageContent | null>(null);

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    const fetchAllContent = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch both pages' content in parallel for efficiency
        const [homeResponse, aboutResponse, customResponse] = await Promise.all([
          api.get('/content/home'),
          api.get('/content/about'),
          api.get('/content/custom-tailoring')
        ]);
        setHomeContent(homeResponse.data);
        setAboutContent(aboutResponse.data);
        setCustomContent(customResponse.data);
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

  // --- CUSTOM TAILORING PAGE HANDLERS ---
  const handleCustomFieldChange = (field: keyof Omit<CustomTailoringPageContent, 'galleryImages'>, value: string) => {
    setCustomContent(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const handleCustomImageArrayChange = (index: number, field: 'altText', value: string) => {
    setCustomContent(prev => {
      if (!prev) return null;
      const newImages = [...prev.galleryImages];
      newImages[index] = { ...newImages[index], [field]: value };
      return { ...prev, galleryImages: newImages };
    });
  };

  const handleCustomImageUpload = (index: number, newImageUrl: string) => {
    setCustomContent(prev => {
      if (!prev) return null;
      const newImages = [...prev.galleryImages];
      newImages[index] = { ...newImages[index], imageUrl: newImageUrl };
      return { ...prev, galleryImages: newImages };
    });
    addAlert('Image has been uploaded and is ready to be saved.', 'success');
  };

  const handleAddCustomImage = () => {
    setCustomContent(prev => {
      if (!prev) return null;
      const newImages = [...prev.galleryImages, { imageUrl: '', altText: '' }];
      return { ...prev, galleryImages: newImages };
    });
  };

  const handleRemoveCustomImage = (index: number) => {
    setCustomContent(prev => {
      if (!prev) return null;
      const newImages = prev.galleryImages.filter((_, i) => i !== index);
      return { ...prev, galleryImages: newImages };
    });
    addAlert('Image slot removed. Save changes to finalize.', 'info');
  };

  // --- 4. SAVE HANDLER ---
  const handleSave = async () => {
    const isHomePage = activePage === 'home';
    const isAboutPage = activePage === 'about';
    const contentToSave = isHomePage ? homeContent : isAboutPage ? aboutContent : customContent;
    const endpoint = `/content/${activePage}`;
    const pageName = isHomePage ? 'Home' : isAboutPage ? 'About Us' : 'Custom Tailoring';

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
      <div className="d-flex justify-content-between align-items-center mb-4" style={{ flexShrink: 0 }}>
        <h2>Page Content Management</h2>
        <div className="d-flex align-items-center gap-2">
          {/* --- The Toggle Button --- */}
          <Button 
            variant="outline-secondary" 
            onClick={() => setIsPreviewVisible(prev => !prev)}
            title={isPreviewVisible ? "Hide Preview" : "Show Preview"}
          >
            {isPreviewVisible ? <EyeSlash /> : <Eye />}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner as="span" size="sm" /> : <Save className="me-2" />}
              Save {activePage === 'home' ? 'Home Page' : activePage === 'about' ? 'About Page' : 'Custom Page'}
          </Button>
        </div>
      </div>  

      <Row className="flex-grow-1" style={{ minHeight: 0 }}>
        {/* === LEFT COLUMN: FORMS (Dynamic Width) === */}
        <Col lg={isPreviewVisible ? 5 : 12} className="d-flex flex-column h-100">
          <Nav variant="tabs" activeKey={activePage} onSelect={(k) => setActivePage(k as 'home' | 'about' | 'custom-tailoring')} className="mb-3" style={{ flexShrink: 0 }}>
            <Nav.Item><Nav.Link eventKey="home">Home Page</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="about">About Us Page</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="custom-tailoring">Custom Page</Nav.Link></Nav.Item>
          </Nav>
          
          <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '1rem' }}>
            {/* Home Page Forms */}
            {activePage === 'home' && homeContent && (
              <Accordion >
                {/* Paste your existing Home Page Accordion.Items here */}
                <Accordion.Item eventKey="0">
                  <Accordion.Header><ImageIcon className="me-2"/>Hero Section</Accordion.Header>
                  <Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Main Title</Form.Label><Form.Control value={homeContent.hero.title} onChange={(e) => handleHomeFieldChange('hero', 'title', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Search Bar Placeholder</Form.Label><Form.Control value={homeContent.hero.searchPlaceholder} onChange={(e) => handleHomeFieldChange('hero', 'searchPlaceholder', e.target.value)} /></Form.Group>
                    <CmsImageUploader label="Background Image" currentImage={homeContent.hero.imageUrl} onUploadSuccess={(newUrl) => handleHomeImageUpload('hero', newUrl)} />
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
                            <CmsImageUploader 
                              label="Service Image"
                              currentImage={service.imageUrl}
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
                          <CmsImageUploader  
                            label="Section Image"
                            currentImage={homeContent.qualityCTA.imageUrl}
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
              <Accordion>
                {/* --- About Page Hero Section --- */}
                <Accordion.Item eventKey="0"><Accordion.Header><ImageIcon className="me-2"/>Hero Section</Accordion.Header><Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Alternative Text for Image</Form.Label><Form.Control value={aboutContent.hero.altText} onChange={(e) => handleAboutFieldChange('hero', 'altText', e.target.value)} /></Form.Group>
                    <CmsImageUploader label="Background Image" currentImage={aboutContent.hero.imageUrl} onUploadSuccess={(newUrl) => handleAboutImageUpload('hero', newUrl)} />
                  </Accordion.Body></Accordion.Item>
                  {/* --- About Page Welcome Section --- */}
                  <Accordion.Item eventKey="1"><Accordion.Header><Book className="me-2"/>Welcome Section</Accordion.Header><Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Heading</Form.Label><Form.Control value={aboutContent.welcome.heading} onChange={(e) => handleAboutFieldChange('welcome', 'heading', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Paragraph</Form.Label><Form.Control as="textarea" rows={4} value={aboutContent.welcome.paragraph} onChange={(e) => handleAboutFieldChange('welcome', 'paragraph', e.target.value)} /></Form.Group>
                  </Accordion.Body></Accordion.Item>
                  {/* --- About Page History Section --- */}
                  <Accordion.Item eventKey="2"><Accordion.Header><CardChecklist className="me-2"/>History Section</Accordion.Header><Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Paragraph</Form.Label><Form.Control as="textarea" rows={4} value={aboutContent.history.paragraph} onChange={(e) => handleAboutFieldChange('history', 'paragraph', e.target.value)} /></Form.Group>
                    <CmsImageUploader label="Section Image" currentImage={aboutContent.history.imageUrl} onUploadSuccess={(newUrl) => handleAboutImageUpload('history', newUrl)} />
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

            {activePage === 'custom-tailoring' && customContent && (
              <Accordion >
                <Accordion.Item eventKey="0">
                  <Accordion.Header><Book className="me-2"/>Main Content</Accordion.Header>
                  <Accordion.Body>
                    <Form.Group className="mb-3"><Form.Label>Heading</Form.Label><Form.Control value={customContent.heading} onChange={(e) => handleCustomFieldChange('heading', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Subheading</Form.Label><Form.Control as="textarea" rows={4} value={customContent.subheading} onChange={(e) => handleCustomFieldChange('subheading', e.target.value)} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Button Text</Form.Label><Form.Control value={customContent.buttonText} onChange={(e) => handleCustomFieldChange('buttonText', e.target.value)} /></Form.Group>
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1">
                  <Accordion.Header><ImageIcon className="me-2"/>Image Gallery ({customContent.galleryImages.length})</Accordion.Header>
                  <Accordion.Body>
                    {customContent.galleryImages.map((image, index) => (
                      <Card key={index} className="mb-3">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                          Image Slot #{index + 1}
                          <Button variant="outline-danger" size="sm" onClick={() => handleRemoveCustomImage(index)}><Trash /></Button>
                        </Card.Header>
                        <Card.Body>
                          <CmsImageUploader label="Image File" currentImage={image.imageUrl} onUploadSuccess={(newUrl) => handleCustomImageUpload(index, newUrl)} />
                          <Form.Group>
                            <Form.Label>Alternative Text</Form.Label>
                            <Form.Control value={image.altText} onChange={(e) => handleCustomImageArrayChange(index, 'altText', e.target.value)} />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    ))}
                    {customContent.galleryImages.length < 6 && (
                      <Button variant="outline-primary" size="sm" onClick={handleAddCustomImage}><PlusCircle className="me-2" />Add Image Slot</Button>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}
          </div>
        </Col>

        {/* === RIGHT COLUMN: PREVIEW (Conditional) === */}
        {isPreviewVisible && (
          <Col lg={7} className="d-flex flex-column h-100">
            <ComponentPreview title="Live Page Preview">
              {activePage === 'home' ? (
                <Home key={`home-preview-${previewVersion}`} />
              ) : activePage === 'about' ? (
                <About key={`about-preview-${previewVersion}`} />
              ) : (
                <CustomTailoring key={`custom-preview-${previewVersion}`} />
              )}
            </ComponentPreview>
          </Col>
        )}
      </Row>
    </Container>
  );
}

export default ContentManagement;




