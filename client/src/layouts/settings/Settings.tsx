import React, { useState, useEffect } from 'react';
import { Container, Card, Tabs, Tab, Alert, Row, Col, Form, Button, Spinner } from 'react-bootstrap';
import { PersonBadge, CalendarWeek } from 'react-bootstrap-icons';
import { ShopSettings } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import ShopScheduleEditor from './shopScheduleEditor/ShopScheduleEditor';
import ProfileSettings from './ProfileSettings';

function Settings() {
  const { addAlert } = useAlert();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSlotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const value = parseInt(e.target.value, 10);
    setSettings({ ...settings, appointmentSlotsPerHour: isNaN(value) ? 0 : value });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const response = await api.put('/settings', { 
        appointmentSlotsPerHour: settings.appointmentSlotsPerHour 
      });
      setSettings(response.data);
      addAlert('Settings saved successfully!', 'success');
    } catch (error) {
      addAlert('Failed to save settings.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Settings</h2>
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <Tabs defaultActiveKey="profile" id="settings-tabs" className="px-3 pt-2" fill>
            {/* --- 2. UPDATE THE "GENERAL" TAB to "PROFILE" --- */}
            <Tab
              eventKey="profile"
              title={<span className="d-flex align-items-center"><PersonBadge className="me-2" /> My Profile</span>}
              className="p-4"
            >
              {/* --- 3. RENDER THE NEW COMPONENT --- */}
              <ProfileSettings />
            </Tab>
            <Tab
              eventKey="schedule"
              title={<span className="d-flex align-items-center"><CalendarWeek className="me-2" /> Shop Closures</span>}
              className="p-4"
            >
              <h5 className="mb-3">Shop Schedule & Closures</h5>
              <p className="text-muted">Set the default number of slots available per hour for all open business days. Use the calendar to mark specific dates as closed.</p>
              <hr />
              {isLoading ? <Spinner /> : settings && (
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold">Default Slots per Hour</Form.Label>
                      <Form.Control 
                        type="number" 
                        min="0"
                        value={settings.appointmentSlotsPerHour}
                        onChange={handleSlotsChange}
                      />
                      <Form.Text>This is the number of available for any open time slot.</Form.Text>
                    </Form.Group>
                    <Button className="mt-3" size='sm' onClick={handleSaveSettings} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Default Slots'}
                    </Button>
                  </Col>
                </Row>
              )}
              <ShopScheduleEditor />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Settings;