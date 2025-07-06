import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { User } from '../../../types';
import { createUser, updateUser } from '../../../api/apiService.ts';
import { useNotification } from '../../../contexts/NotificationContext';

interface UserFormModalProps {
    show: boolean;
    onHide: () => void;
    onSave: () => void;
    userToEdit: User | null;
}

function UserFormModal({ show, onHide, onSave, userToEdit }: UserFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'User' as 'Admin' | 'User',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addNotification } = useNotification();
    const isEditMode = !!userToEdit;

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                name: userToEdit.name,
                email: userToEdit.email,
                password: '', // Password should be empty for editing for security
                role: userToEdit.role,
            });
        } else {
            // Reset form for new user
            setFormData({ name: '', email: '', password: '', role: 'User' });
        }
        // Reset error when modal opens/changes mode
        setError(null);
    }, [userToEdit, show]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isEditMode) {
                // Don't send an empty password field for update
                const { password, ...updateData } = formData;
                await updateUser(userToEdit._id, updateData);
                addNotification(`User '${formData.name}' updated successfully.`, 'success');
            } else {
                await createUser(formData);
                addNotification(`User '${formData.name}' created successfully.`, 'success');
            }
            onSave(); // This will trigger a re-fetch in the parent
        } catch (err: any) {
            const message = err.response?.data?.message || 'An error occurred.';
            setError(message);
            addNotification(message, 'danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} backdrop="static" centered>
            <Modal.Header closeButton>
                <Modal.Title>{isEditMode ? 'Edit User' : 'Add New User'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form.Group className="mb-3">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Password</Form.Label>
                        <Form.Control type="password" name="password" value={formData.password} onChange={handleChange} placeholder={isEditMode ? 'Leave blank to keep current password' : ''} required={!isEditMode} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Role</Form.Label>
                        <Form.Select name="role" value={formData.role} onChange={handleChange}>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? <Spinner as="span" animation="border" size="sm" /> : (isEditMode ? 'Save Changes' : 'Create User')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default UserFormModal;