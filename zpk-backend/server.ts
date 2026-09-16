import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "zpk_max_super_secret_key_123";

// User Schema & Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  myList: { type: Array, default: [] },
  continueWatching: { type: Array, default: [] },
});

const User = mongoose.model("User", userSchema);

// Auth Route: Register or Login with bcrypt
app.post(
  "/api/auth/register-or-login",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Kailangan ang email at password." });
      }

      let user = await User.findOne({ email });

      if (!user) {
        // New user: Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ email, password: hashedPassword });
        await user.save();
      } else {
        // Existing user: Verify password against hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: "Maling password." });
        }
      }

      // Generate JWT Token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      return res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          myList: user.myList,
          continueWatching: user.continueWatching,
        },
      });
    } catch (error) {
      console.error("Auth Error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Sync User Data Route (My List & Continue Watching)
app.post(
  "/api/user/sync-list",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized access" });
      }

      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const { myList, continueWatching } = req.body;

      const updatedUser = await User.findByIdAndUpdate(
        decoded.userId,
        { myList: myList || [], continueWatching: continueWatching || [] },
        { new: true },
      );

      return res.json({
        message: "Data synced successfully",
        myList: updatedUser?.myList,
        continueWatching: updatedUser?.continueWatching,
      });
    } catch (error) {
      console.error("Sync Error:", error);
      return res.status(500).json({ message: "Failed to sync user data" });
    }
  },
);

// Connect to MongoDB and Listen
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
