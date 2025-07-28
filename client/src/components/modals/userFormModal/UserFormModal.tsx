import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { User, Role } from '../../../types';
import { createUser, updateUser, fetchRoles } from '../../../api/apiService';
import { useAlert } from '../../../contexts/AlertContext';

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
        roleId: '', // Changed from 'role'
    });
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { addAlert } = useAlert();
    const isEditMode = !!userToEdit;

        useEffect(() => {
        const loadRolesAndSetForm = async () => {
            // --- SET LOADING STATE ---
            setInitialLoading(true);
            setError(null); // Clear previous errors

            try {
                const fetchedRoles = await fetchRoles();
                setRoles(fetchedRoles);
                
                if (isEditMode && userToEdit) {
                    setFormData({
                        name: userToEdit.name,
                        email: userToEdit.email,
                        password: '',
                        roleId: userToEdit.role._id,
                    });
                } else {
                    setFormData({
                        name: '',
                        email: '',
                        password: '',
                        roleId: fetchedRoles.length > 0 ? fetchedRoles[0]._id : '',
                    });
                }
            } catch {
                setError('Could not load available roles. Please try again.');
            } finally {
                // --- UNSET LOADING STATE ---
                setInitialLoading(false);
            }
        };

        if (show) {
            loadRolesAndSetForm();
        }
    }, [userToEdit, show, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const userData = {
            name: formData.name,
            email: formData.email,
            roleId: formData.roleId,
        };

        try {
            if (isEditMode && userToEdit) {
                const updateData: any = { ...userData };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await updateUser(userToEdit._id, updateData);
                // --- FIX: Use formData.name ---
                addAlert(`User '${formData.name}' updated successfully.`, 'success');
            } else {
                const createData = { ...userData, password: formData.password };
                await createUser(createData);
                // --- FIX: Use formData.name ---
                addAlert(`User '${formData.name}' created successfully.`, 'success');
            }
            onSave();
        } catch (err) {
            // ... error handling
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} backdrop="static" centered>
            <Modal.Header closeButton>
                <Modal.Title>{isEditMode ? 'Edit Account' : 'Add New Account'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {initialLoading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                            <p className="mt-2">Loading...</p>
                        </div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : (
                        <>
                            <Row>
                                <Col>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Full Name</Form.Label>
                                        <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Role</Form.Label>
                                        <Form.Select name="roleId" value={formData.roleId} onChange={handleChange} required>
                                            <option value="" disabled>Select a role...</option>
                                            {roles.map(role => (
                                                <option key={role._id} value={role._id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder={isEditMode ? 'Leave blank to keep current password' : ''}
                                    required={!isEditMode}
                                    autoComplete={isEditMode ? 'off' : 'new-password'}
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? <Spinner as="span" animation="border" size="sm" /> : (isEditMode ? 'Save Changes' : 'Create Account')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default UserFormModal;