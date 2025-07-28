// client/src/components/modals/roleFormModal/RoleFormModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col, ListGroup } from 'react-bootstrap';
import { Role, Permission } from '../../../types';
import { createRole, updateRole, fetchPermissions } from '../../../api/apiService';
import { useAlert } from '../../../contexts/AlertContext';
import axios from 'axios';

interface RoleFormModalProps {
    show: boolean;
    onHide: () => void;
    onSave: () => void;
    roleToEdit: Role | null;
}

function RoleFormModal({ show, onHide, onSave, roleToEdit }: RoleFormModalProps) {
    const [name, setName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { addAlert } = useAlert();
    const isEditMode = !!roleToEdit;

    // Effect to fetch all available permissions once when the modal is first shown
    useEffect(() => {
        const loadPermissions = async () => {
            try {
                const data = await fetchPermissions();
                setAllPermissions(data);
            } catch {
                setError('Could not load permissions list.');
            }
        };
        if (show) {
            loadPermissions();
        }
    }, [show]);

    // Effect to populate the form when editing a role
    useEffect(() => {
        if (show && isEditMode && roleToEdit) {
            setName(roleToEdit.name);
            setSelectedPermissions(roleToEdit.permissions || []);
        } else {
            setName('');
            setSelectedPermissions([]);
        }
        setError(null);
    }, [roleToEdit, show, isEditMode]);

    const handlePermissionToggle = (permissionId: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const roleData = { name, permissions: selectedPermissions };

        try {
            if (isEditMode && roleToEdit) {
                await updateRole(roleToEdit._id, roleData);
                addAlert(`Role '${name}' updated successfully.`, 'success'); 
            } else {
                await createRole(roleData);
                addAlert(`Role '${name}' created successfully.`, 'success'); 
            }
            onSave(); // This calls the parent's onSave, which hides the modal and reloads the roles
        } catch (err) {
            let message = 'An unexpected error occurred.';
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                message = err.response.data.message;
            } else if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} backdrop="static" centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{isEditMode ? 'Edit Role' : 'Add New Role'}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form.Group className="mb-4">
                        <Form.Label>Role Name</Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g., Staff, Manager"
                        />
                    </Form.Group>
                    
                    <Form.Group>
                        <Form.Label>Permissions</Form.Label>
                        <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {allPermissions.map(permission => (
                                <ListGroup.Item key={permission._id}>
                                    <Form.Check
                                        type="checkbox"
                                        id={`perm-${permission._id}`}
                                        label={<strong>{permission._id.replace(/_/g, ' ')}</strong>}
                                        checked={selectedPermissions.includes(permission._id)}
                                        onChange={() => handlePermissionToggle(permission._id)}
                                    />
                                    <small className="text-muted ms-4">{permission.description}</small>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? <Spinner as="span" animation="border" size="sm" /> : (isEditMode ? 'Save Changes' : 'Create Role')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default RoleFormModal;