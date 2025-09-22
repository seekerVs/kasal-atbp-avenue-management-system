import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { User } from '../../../types';
import { createUser, updateUser } from '../../../api/apiService';
import { useAlert } from '../../../contexts/AlertContext';

interface UserFormModalProps {
    show: boolean;
    onHide: () => void;
    onSave: () => void;
    userToEdit: User | null;
}

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: 'Super Admin' | 'Standard'; 
  status: 'active' | 'inactive' | 'suspended';
};

function UserFormModal({ show, onHide, onSave, userToEdit }: UserFormModalProps) {
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        password: '',
        role: 'Standard', 
        status: 'active',
    });
    const [isSaving, setIsSaving] = useState(false); // Renamed from 'loading' for clarity
    const [apiError, setApiError] = useState<string | null>(null);

    const { addAlert } = useAlert();
    const isEditMode = !!userToEdit;

    useEffect(() => {
        if (show) {
            if (isEditMode && userToEdit) {
                // Populate the form with the user's data for editing
                setFormData({
                    name: userToEdit.name,
                    email: userToEdit.email,
                    password: '',
                    role: userToEdit.role,
                    status: userToEdit.status || 'active',
                });
            } else {
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'Standard',
                    status: 'active',
                });
            }
            setApiError(null);
        }
    }, [userToEdit, show, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'status' || name === 'role') ? value as any : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setApiError(null);

        const userData = {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            status: formData.status,
        };

        try {
            if (isEditMode && userToEdit) {
                const updateData: Partial<UserFormData> = { ...userData };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await updateUser(userToEdit._id, updateData);
                addAlert(`User '${formData.name}' updated successfully.`, 'success');
            } else {
                const createData = { ...userData, password: formData.password };
                await createUser(createData);
                addAlert(`User '${formData.name}' created successfully.`, 'success');
            }
            onSave();
        } catch (err: any) {
            setApiError(err.response?.data?.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} backdrop="static" centered>
            <Modal.Header closeButton>
                <Modal.Title>{isEditMode ? 'Edit Account' : 'Add New Account'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {/* The loading spinner is no longer needed here as there's no initial data fetch */}
                    {apiError && <Alert variant="danger">{apiError}</Alert>}
                    
                    <Row>
                        <Col>
                            <Form.Group className="mb-3">
                                <Form.Label>Full Name</Form.Label>
                                <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required />
                            </Form.Group>
                        </Col>
                        {/* --- 7. REPLACE the old Role dropdown with the new one --- */}
                        <Col>
                            <Form.Group className="mb-3">
                                <Form.Label>Role</Form.Label>
                                <Form.Select name="role" value={formData.role} onChange={handleChange} required>
                                    <option value="Standard">Standard</option>
                                    <option value="Super Admin">Super Admin</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" />
                    </Form.Group>
                    
                    <Row>
                        <Col>
                            <Form.Group className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder={isEditMode ? 'Leave blank to keep current' : ''}
                                    required={!isEditMode}
                                    autoComplete={isEditMode ? 'off' : 'new-password'}
                                />
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select name="status" value={formData.status} onChange={handleChange} required>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={isSaving}>Cancel</Button>
                    <Button variant="primary" type="submit" disabled={isSaving}>
                        {isSaving ? <Spinner as="span" animation="border" size="sm" /> : (isEditMode ? 'Save Changes' : 'Create Account')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default UserFormModal;