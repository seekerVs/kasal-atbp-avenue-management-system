// client/src/components/rolesManager/RolesManager.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    Card, Button, Spinner, Alert, ListGroup, Col, Row, Badge,
    Modal
} from 'react-bootstrap';
import { ShieldPlus, ShieldShaded, PencilSquare, Trash } from 'react-bootstrap-icons';
import { fetchRoles, deleteRole } from '../../api/apiService';
import { Role } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
// We'll create and import this modal in the next step
import RoleFormModal from '../../components/modals/roleFormModal/RoleFormModal';


const DeleteRoleConfirmationModal = ({ show, onHide, onConfirm, roleName }: { show: boolean, onHide: () => void, onConfirm: () => void, roleName: string }) => (
    <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            Are you sure you want to delete the role: <strong>{roleName}</strong>? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>Cancel</Button>
            <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </Modal.Footer>
    </Modal>
);

function RolesManager() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [currentRole, setCurrentRole] = useState<Role | null>(null);

    const { addNotification } = useNotification();

    const loadRoles = async () => {
        setLoading(true);
        try {
            const data = await fetchRoles();
            setRoles(data);
        } catch (err) {
            setError('Failed to fetch roles.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    const handleDeleteRole = async () => {
        if (!currentRole) return;
        try {
            await deleteRole(currentRole._id);
            addNotification('Role deleted successfully.', 'success');
            setShowDeleteModal(false);
            setCurrentRole(null);
            loadRoles();
        } catch {
            addNotification('Failed to delete role.', 'danger');
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <Card className="shadow-sm">
            <Card.Header>
                <Row className="align-items-center">
                    <Col>
                        <div className="d-flex align-items-center">
                            <ShieldShaded size={24} className="me-2" />
                            <h5 className="mb-0">All Roles</h5>
                        </div>
                    </Col>
                    <Col xs="auto">
                        <Button onClick={() => { setCurrentRole(null); setShowFormModal(true); }}>
                            <ShieldPlus className="me-2" /> Add New Role
                        </Button>
                    </Col>
                </Row>
            </Card.Header>
            <ListGroup variant="flush">
                {roles.map(role => (
                    <ListGroup.Item key={role._id}>
                        <Row className="align-items-center">
                            <Col>
                                <strong className="fs-5">{role.name}</strong>
                                <p className="text-muted mb-0 small">
                                    Permissions: {role.permissions.length > 0 ? role.permissions.join(', ').replace(/_/g, ' ') : 'None'}
                                </p>
                            </Col>
                            <Col xs="auto" className="d-flex gap-2">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => { setCurrentRole(role); setShowFormModal(true); }}
                                >
                                    <PencilSquare />
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => { setCurrentRole(role); setShowDeleteModal(true); }}
                                >
                                    <Trash />
                                </Button>
                            </Col>
                        </Row>
                    </ListGroup.Item>
                ))}
            </ListGroup>

            <RoleFormModal
                show={showFormModal}
                onHide={() => setShowFormModal(false)}
                onSave={() => {
                    setShowFormModal(false);
                    loadRoles(); // Hide modal and reload roles on successful save
                }}
                roleToEdit={currentRole}
            />

            {showDeleteModal && currentRole && (
                <DeleteRoleConfirmationModal
                    show={showDeleteModal}
                    onHide={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteRole}
                    roleName={currentRole.name}
                />
            )}
        </Card>
    );
}

export default RolesManager;