import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Spinner, Card } from 'react-bootstrap';
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
        setDraftUser(response.data);
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
      setUser(response.data);
      setDraftUser(response.data);
      setIsEditMode(false);
      addAlert('Profile details updated!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to save details.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftUser(user);
    setIsEditMode(false);
  };

  if (isLoading) return <Spinner animation="border" />;
  if (!user || !draftUser) return <p>Could not load user profile.</p>;

  return (
    <>
      {/* --- MODIFICATION START: The Row now centers a single column --- */}
      <Row >
        <Col md={10} lg={8}>
        {/* --- MODIFICATION END --- */}
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
                <>
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p className="mb-0"><strong>Role:</strong> {user.role}</p>
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

      </Row>

      <ChangePasswordModal
        show={showPasswordModal}
        onHide={() => setShowPasswordModal(false)}
      />
    </>
  );
}

export default ProfileSettings;