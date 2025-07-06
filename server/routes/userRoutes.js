import express from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
// You should have middleware to protect routes and check for admin role
// import { protect, admin } from '../middleware/auth.middleware';

const router = express.Router();

// For now, we'll assume routes are protected. In a real app, you'd add middleware:
// router.route('/').get(protect, admin, getUsers).post(protect, admin, createUser);
// router.route('/:id').put(protect, admin, updateUser).delete(protect, admin, deleteUser);

router.route('/').get(getUsers).post(createUser);
router.route('/:id').put(updateUser).delete(deleteUser);


export default router;  