import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { User, UserModel } from "../models/userModel";
import { CacheService } from "./cacheServices";

export class AuthServices {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || "shortlycut";
  private static readonly TOKEN_EXPIRY = "24h";

  private static generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: this.TOKEN_EXPIRY,
    });
  }

  static async register(
    username: string,
    email: string,
    password: string
  ): Promise<{ user: Omit<User, "password">; token: string }> {
    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Create new user
    const userId = uuidv4();
    const user = await UserModel.create({
      id: userId,
      username,
      email,
      password,
    });

    // Generate token
    const token = this.generateToken(userId);

    // Cache user data
    await CacheService.setCache(`user:${userId}`, user, 1800); // Cache for 1 hour

    return { user, token };
  }

  static async login(email: string, password: string): Promise<{ user: Omit<User, 'password'>, token: string }> {
    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate token
    const token = this.generateToken(user.id);

    // Cache user data
    const userData = { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      created_at: user.created_at // Include the created_at property
    };
    await CacheService.setCache(`user:${user.id}`, userData, 1800);

    return { user: userData, token };
  }

  static async validateToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };
      return decoded.userId;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static async logout(userId: string): Promise<void> {
    // Remove user data from cache
    await CacheService.setCache(`user:${userId}`, null, 0);
  }
}
