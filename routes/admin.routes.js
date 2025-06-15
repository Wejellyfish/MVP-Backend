
const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/admin.controller.js');

router.get("/users", getUsers);

module.exports = router;