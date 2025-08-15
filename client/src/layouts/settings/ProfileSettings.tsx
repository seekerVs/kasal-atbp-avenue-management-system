import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button, Spinner, Card, ListGroup } from 'react-bootstrap';
import { User } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { ValidatedInput } from '../../components/forms/ValidatedInput';
import { ChangePasswordModal } from '../../components/modals/changePasswordModal/ChangePasswordModal';

function ProfileSettings() {
  const { addAlert } = useAlert();
  const [user, setUser] = useState<User | null>(null);
  const [draftUser, setDraftUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/users/me');
        setUser(response.data);
        setDraftUser(response.data); // Initialize draft for editing
      } catch (error) {
        addAlert('Could not fetch your profile data.', 'danger');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrentUser();
  }, [addAlert]);

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!draftUser) return;
    setDraftUser({ ...draftUser, [e.target.name]: e.target.value });
  };

  const handleSaveDetails = async () => {
    if (!draftUser) return;
    setIsSaving(true);
    try {
      const response = await api.put('/users/me', {
        name: draftUser.name,
        email: draftUser.email,
      });
      setUser(response.data); // Update main state with saved data
      setDraftUser(response.data); // Sync draft state
      setIsEditMode(false); // Exit edit mode
      addAlert('Profile details updated!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to save details.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftUser(user); // Revert changes by resetting draft to main state
    setIsEditMode(false);
  };

  if (isLoading) return <Spinner animation="border" />;
  if (!user || !draftUser) return <p>Could not load user profile.</p>;

  // Safely access permissions, providing an empty array as a fallback
  const permissions = user.role?.permissions || [];

  return (
    <>
      <Row className="g-2">
        {/* --- DETAILS & EDIT FORM COLUMN --- */}
        <Col md={6}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Your Details</h5>
              {!isEditMode && (
                <Button variant="outline-secondary" size="sm" onClick={() => setIsEditMode(true)}>
                  Edit
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {isEditMode ? (
                // --- EDIT MODE ---
                <>
                  <ValidatedInput label="Name" name="name" value={draftUser.name} onChange={handleDraftChange} />
                  <ValidatedInput label="Email" name="email" type="email" value={draftUser.email} onChange={handleDraftChange} />
                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button variant="secondary" size='sm' onClick={handleCancelEdit}>Cancel</Button>
                    <Button variant="primary" size='sm' onClick={handleSaveDetails} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              ) : (
                // --- VIEW MODE ---
                <>
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p className="mb-0"><strong>Role:</strong> {user.role.name}</p>
                </>
              )}
            </Card.Body>
            <Card.Footer>
              <Button variant="outline-primary" size='sm' onClick={() => setShowPasswordModal(true)}>
                Change Password
              </Button>
            </Card.Footer>
          </Card>
        </Col>

        {/* --- PERMISSIONS COLUMN --- */}
        <Col md={6}>
          <Card>
            <Card.Header as="h5">Your Role Permissions</Card.Header>
            <ListGroup variant="flush" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {permissions.length > 0 ? (
                permissions.map((perm: any) => (
                  <ListGroup.Item key={perm._id}>
                    <p className="fw-bold mb-0 text-capitalize">{perm._id.replace(/_/g, ' ')}</p>
                    <p className="text-muted small mb-0">{perm.description}</p>
                  </ListGroup.Item>
                ))
              ) : (
                <ListGroup.Item className="text-muted">
                  Your role currently has no specific permissions assigned.
                </ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>

      {/* --- RENDER THE MODAL --- */}
      <ChangePasswordModal
        show={showPasswordModal}
        onHide={() => setShowPasswordModal(false)}
      />
    </>
  );
}

export default ProfileSettings;