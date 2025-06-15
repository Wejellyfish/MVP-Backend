// server.js
const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const mobileRoutes = require("./routes/mobile.routes");
const adminRoutes = require("./routes/admin.routes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mobile", mobileRoutes);
app.use("/api/admin", adminRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


