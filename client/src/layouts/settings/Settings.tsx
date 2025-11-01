import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Spinner, Tab, Nav } from 'react-bootstrap';
import { PersonBadge, CalendarWeek, GearFill } from 'react-bootstrap-icons';
import { ShopSettings } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import ShopScheduleEditor from './shopScheduleEditor/ShopScheduleEditor';
import ProfileSettings from './ProfileSettings';
import DatePicker from 'react-datepicker';

function Settings() {
  const { addAlert } = useAlert();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string | undefined }>({});
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/settings');
        setSettings(response.data);
      } catch (error) {
        addAlert('Could not load shop settings.', 'danger');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [addAlert]);

  const handleSettingsChange = (name: string, value: any) => {
      if (!settings) return;

      if (formErrors[name]) {
          setFormErrors(prev => ({ ...prev, [name]: undefined }));
      }

      const newSettings = { ...settings, [name]: value };
      setSettings(newSettings);
  };

  const validateSettings = (): boolean => {
    if (!settings) return false;
    const errors: { [key: string]: string } = {};

    if (settings.appointmentSlotsPerDay < 0) {
      errors.appointmentSlotsPerDay = "Slots per day cannot be a negative number.";
    }

    // Only validate the phone number if it's not empty
    if (settings.gcashNumber && !/^09\d{9}$/.test(settings.gcashNumber)) {
      errors.gcashNumber = "Please enter a valid 11-digit phone number starting with 09.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSettings = async () => {
    if (!validateSettings()) {
      addAlert("Please correct the validation errors.", "warning");
      return;
    }

    if (!settings) return;
    setIsSaving(true);
    try {
      const response = await api.put('/settings', settings);
      setSettings(response.data);
      addAlert('General settings saved successfully!', 'success');
    } catch (error) {
      addAlert('Failed to save settings.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Settings</h2>
      
      {/* --- This is the new Vertical Tab Layout --- */}
      <Tab.Container id="settings-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'general')}>
        <Row>
          {/* --- LEFT COLUMN: NAVIGATION --- */}
          <Col md={4} lg={3}>
            <Nav variant="pills" className="flex-column">
              <Nav.Item>
                <Nav.Link eventKey="general">
                  <GearFill className="me-2" /> General
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="profile">
                  <PersonBadge className="me-2" /> My Profile
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="schedule">
                  <CalendarWeek className="me-2" /> Schedule & Closures
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>

          {/* --- RIGHT COLUMN: CONTENT --- */}
          <Col md={8} lg={9}>
            <Tab.Content>
              <Tab.Pane eventKey="general">
                <Card className="shadow-sm">
                  <Card.Header as="h5">General Shop Settings</Card.Header>
                  <Card.Body>
                    <p className="text-muted">Set the default shop parameters for appointments and payments.</p>
                    <hr />
                    {isLoading ? <Spinner /> : settings && (
                      <Form noValidate onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }}>
                        <Row>
                          <Col md={10} lg={8}>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-bold">Default Appointment Slots per Day</Form.Label>
                              <Form.Control type="number" name="appointmentSlotsPerDay" value={settings.appointmentSlotsPerDay} onChange={(e) => handleSettingsChange(e.target.name, parseInt(e.target.value, 10) || 0)} isInvalid={!!formErrors.appointmentSlotsPerDay} min="0" />
                              <Form.Control.Feedback type="invalid">{formErrors.appointmentSlotsPerDay}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-bold">GCash Account Name</Form.Label>
                              <Form.Control type="text" name="gcashName" placeholder="e.g., Juan Dela Cruz" value={settings.gcashName || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                              <Form.Label className="fw-bold">GCash Account Number</Form.Label>
                              <Form.Control type="text" name="gcashNumber" placeholder="e.g., 09171234567" value={settings.gcashNumber || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} isInvalid={!!formErrors.gcashNumber} />
                              <Form.Control.Feedback type="invalid">{formErrors.gcashNumber}</Form.Control.Feedback>
                            </Form.Group>
                            
                            <hr />
                            <h6 className="text-muted">Invoice & Receipt Details</h6>

                            <Form.Group className="mb-3"><Form.Label className="fw-bold">Owner's Full Name (for Invoice)</Form.Label><Form.Control type="text" name="ownerName" value={settings.ownerName || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="fw-bold">Owner's TIN (for Invoice)</Form.Label><Form.Control type="text" name="ownerTIN" value={settings.ownerTIN || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="fw-bold">Shop Address</Form.Label><Form.Control as="textarea" rows={2} name="shopAddress" value={settings.shopAddress || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="fw-bold">Shop Contact Number</Form.Label><Form.Control type="text" name="shopContactNumber" value={settings.shopContactNumber || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="fw-bold">Shop Email Address</Form.Label><Form.Control type="email" name="shopEmail" value={settings.shopEmail || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="fw-bold">BIR Accreditation Number</Form.Label><Form.Control type="text" name="accreditationNumber" value={settings.accreditationNumber || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="fw-bold">Accreditation Date</Form.Label>
                              <DatePicker selected={settings.accreditationDate ? new Date(settings.accreditationDate) : null} onChange={(date: Date | null) => handleSettingsChange('accreditationDate', date)} className="form-control" dateFormat="MMMM d, yyyy" />
                            </Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="fw-bold">Default Payment Terms</Form.Label><Form.Control type="text" name="paymentTerms" value={settings.paymentTerms || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} /></Form.Group>
                            <Form.Group className="mb-3"><Form.Label className="fw-bold">Business Style</Form.Label><Form.Control type="text" name="businessStyle" value={settings.businessStyle || ''} onChange={(e) => handleSettingsChange(e.target.name, e.target.value)} /></Form.Group>

                          </Col>
                        </Row>
                      </Form>
                    )}
                  </Card.Body>
                  <Card.Footer className="text-end">
                    <Button type="submit" onClick={handleSaveSettings} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </Card.Footer>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane eventKey="profile">
                {/* The ProfileSettings component is already structured like a Card */}
                <ProfileSettings />
              </Tab.Pane>

              <Tab.Pane eventKey="schedule">
                <Card className="shadow-sm">
                   <Card.Header as="h5">Shop Schedule & Closures</Card.Header>
                   <Card.Body>
                    <p className="text-muted">Use the calendar to mark specific dates (e.g., holidays) as closed for appointments and reservations.</p>
                    <hr />
                    <ShopScheduleEditor />
                   </Card.Body>
                </Card>
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Container>
  );
}

export default Settings;