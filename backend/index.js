const express = require("express");
// const mongoose = require('mongoose');
const cors = require("cors");
const connectDB = require("./db.js");
const UserModel = require("./models/Users");

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find the user by email
    const user = await UserModel.findOne({ email });

    if (!user) {
      // If user is not found, send a specific message
      return res
        .status(401)
        .json({ success: false, message: "Email not found." });
    }

    // 2. Compare the provided password with the stored password
    //    IMPORTANT: In a real app, you would hash passwords (e.g., using bcrypt)
    //    and compare the hash here: `const isMatch = await bcrypt.compare(password, user.password);`
    if (password !== user.password) {
      // This is INSECURE for production!
      // If password doesn't match, send a specific message
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password." });
    }

    // 3. If credentials match, generate a token (e.g., JWT)
    const token = `dummy_jwt_token_for_${user._id}`; // Replace with actual JWT generation

    res
      .status(200)
      .json({ success: true, message: "Logged in successfully", token });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
  }
});

app.post("/createUser", (req, res) => {
  UserModel.create(req.body)
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.get("/", (req, res) => {
  UserModel.find({})
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.get("/getUser/:id", (req, res) => {
  const id = req.params.id;
  UserModel.findById({ _id: id })
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.put("/updateUser/:id", (req, res) => {
  const id = req.params.id;
  UserModel.findByIdAndUpdate(
    { _id: id },
    {
      name: req.body.name,
      email: req.body.email,
      age: req.body.age,
    }
  )
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.delete("/deleteUser/:id", (req, res) => {
  const id = req.params.id;
  UserModel.findByIdAndDelete({ _id: id })
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
