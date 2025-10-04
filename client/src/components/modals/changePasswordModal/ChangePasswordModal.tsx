import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useAlert } from '../../../contexts/AlertContext';
import api from '../../../services/api';
import { ValidatedInput } from '../../forms/ValidatedInput';

interface ChangePasswordModalProps {
  show: boolean;
  onHide: () => void;
}

const initialPasswordState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function ChangePasswordModal({ show, onHide }: ChangePasswordModalProps) {
  const { addAlert } = useAlert();
  const [passwordData, setPasswordData] = useState(initialPasswordState);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!passwordData.currentPassword) newErrors.currentPassword = 'Current password is required.';
    if (passwordData.newPassword.length < 6) newErrors.newPassword = 'New password must be at least 6 characters.';
    if (passwordData.newPassword !== passwordData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsSaving(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      addAlert('Password updated successfully!', 'success');
      onHide(); // Close modal on success
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to update password.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form when the modal is closed
  const handleExited = () => {
    setPasswordData(initialPasswordState);
    setErrors({});
  };

  return (
    <Modal show={show} onHide={onHide} centered onExited={handleExited}>
      <Modal.Header closeButton>
        <Modal.Title>Change Your Password</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handlePasswordSubmit}>
        <Modal.Body>
          <ValidatedInput
            label="Current Password"
            type="password"
            name="currentPassword"
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            error={errors.currentPassword}
            isRequired
          />
          <ValidatedInput
            label="New Password"
            type="password"
            name="newPassword"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            error={errors.newPassword}
            isRequired
          />
          <ValidatedInput
            label="Confirm New Password"
            type="password"
            name="confirmPassword"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            error={errors.confirmPassword}
            isRequired
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Update Password'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}