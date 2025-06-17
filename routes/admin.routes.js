
const express = require('express');
const router = express.Router();
const { adminLogin, getUsers, getUserById, createUser, updateUser, deleteUserById, deleteMultipleUsers } = require('../controllers/admin.controller.js');
const { adminAuthToken } = require('../middlewares/auth.middleware.js');

router.post("/login", adminLogin);
router.get("/users", adminAuthToken, getUsers);
router.get("/users/:id", adminAuthToken, getUserById);
router.post("/users/create", adminAuthToken, createUser);

router.put("/users/:id", adminAuthToken, updateUser);

router.delete('/users/:id', adminAuthToken, deleteUserById);

router.post("/users/delete-multiple", adminAuthToken, deleteMultipleUsers);


module.exports = router;