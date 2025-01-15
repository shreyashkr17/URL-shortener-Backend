import { urlQueue } from "../config/queue";
import { authQueue } from "../config/queue";
import { apiQueue } from "../config/queue";
import { Request, Response, NextFunction } from "express";
import { AuthController } from "../controllers/authController";
import { AuthMiddleware } from "../middleware/authMiddleware";
import { AuthServices } from "../services/authServices";
import { UserModel } from "../models/userModel";
import path from "path";
import fs from "fs";

// Rendering Index Files
const processIndexRender = async (job: any) => {
  const { filePath, rootDir } = job.data;
  try {
    console.log("Process started: Rendering Index File");
    // res.sendFile('index.html', {root: rootDir})
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error("Index file not found");
    }
    console.log("Process completed: Sucessfully rendered Index File");
    return { success: true, filePath, rootDir };
  } catch (error) {
    console.error("Error during rendering:", error);
    throw new Error("Rendering index.html failed");
  }
};
urlQueue.process("renderIndex", async (job) => {
  return processIndexRender(job);
});

// Process Register, Login, Logout, Profile

authQueue.process("register", async (job) => {
  const { username, email, password } = job.data;
  try {
    console.log("Processing register task...");

    if (!username || !email || !password) {
      return {
        success: false,
        error: "All fields are required",
        status: 400,
      };
    }
    const { user, token } = await AuthServices.register(
      username,
      email,
      password
    );

    console.log("Register task completed successfully");

    return {
      success: true,
      user,
      token,
      status: 201,
    };
  } catch (error: any) {
    console.error("Error in register task:", error);
    return {
      success: false,
      error: error.message,
      status: 400,
    };
  }
});

authQueue.process("login", async (job) => {
  const { body } = job.data;
  // const { req, res } = job.data;

  try {
    console.log("Processing login task...");
    if (!body.email || !body.password) {
      return {
        error: "Email and password are required",
        status: 400,
      };
    }

    const { user, token } = await AuthController.login(body);

    console.log("Login task completed successfully.");

    return {
      user,
      token,
      status: 200,
    };
    //   console.log('Login task completed successfully.');
  } catch (error: any) {
    console.error("Error in login task:", error);
    return {
      error: error.message,
      status: 401,
    };
  }
});

authQueue.process("logout", async (job) => {
  const { token, userId } = job.data;

  try {
    console.log("Processing logout task...");

    if (!token) {
      return {
        success: false,
        error: "Authentication Required",
        status: 401,
      };
    }

    const validatedUserId = await AuthServices.validateToken(token);
    const user = await UserModel.findById(validatedUserId);

    if (!user) {
      return {
        success: false,
        error: "Invalid Token",
        status: 401,
      };
    }

    await AuthServices.logout(user.id);

    console.log("Logout task completed successfully.");

    return {
      success: true,
      message: "Logged out successfully",
      status: 200,
    };
  } catch (error) {
    console.error("Error in logout task:", error);
    throw error;
  }
});

authQueue.process("profile", async (job) => {
  const { token } = job.data;

  try {
    console.log("Processing profile task...");
    if (!token) {
      return {
        success: false,
        error: "Authentication Required",
        status: 401,
      };
    }

    const userId = await AuthServices.validateToken(token);
    if (!userId) {
      return {
        success: false,
        error: "Invalid Token",
        status: 401,
      };
    }

    console.log("Authentication middleware passed for profile.");
    const urls = await AuthController.getProfile(userId);

    return {
      success: true,
      data: urls,
      status: 200,
    };
    // console.log("Profile task completed successfully.");
  } catch (error) {
    console.error("Error in profile task:", error);
    throw error;
  }
});

// Process for API Token for a user
apiQueue.process("generate-api-token", async (job) => {
  const { token } = job.data;

  try {
    console.log("Generating API Token...");
    if (!token) {
      return {
        success: false,
        error: "Authentication Required",
        status: 401,
      };
    }

    console.log(
      "Authentication middleware passed for generating token profile..."
    );
    const userId = await AuthServices.validateToken(token);

    const user = await UserModel.findById(userId);

    if (!user) {
      return {
        success: false,
        error: "Invalid Token",
        status: 401,
      };
    }

    const apiToken = await AuthController.generateAPIToken(user.id);

    return {
      success: true,
      apiToken,
      status: 200,
    };
    // console.log("Generate/Regenerate API token sucessfully completed");
  } catch (error: any) {
    console.log("Error in generating api_token task:", error);
    return {
      success: false,
      error: error.message || "Internal Server Error",
      status: 500,
    };
  }
});

apiQueue.process("list-tokens", async (job) => {
  const { token } = job.data;

  try {
    console.log("Listing Tokens...");
    if (!token) {
      return {
        success: false,
        error: "Authentication Required",
        status: 401,
      };
    }

    const userId = await AuthServices.validateToken(token);
    const user = await UserModel.findById(userId);

    if (!user) {
      return {
        success: false,
        error: "Invalid Token",
        status: 401,
      };
    }

    const tokens = await AuthController.listApiTokens(user.id);

    return {
      success: true,
      tokens,
      status: 200,
    };
    console.log("Listing API token sucessfully completed");
  } catch (error: any) {
    console.log("Error in listing API tokens task: ", error);
    return {
      success: false,
      error: error.message || "Internal Server Error",
      status: 500,
    };
  }
});

apiQueue.process("delete-token-id", async (job) => {
  const { token, tokenId } = job.data;

  try {
    console.log("Deleteing API Tokens...");
    if (!token) {
      return {
        success: false,
        error: "Authentication Required",
        status: 401,
      };
    }

    const userId = await AuthServices.validateToken(token);
    const user = await UserModel.findById(userId);

    if (!user) {
      return {
        success: false,
        error: "Invalid Token",
        status: 401,
      };
    }

    await AuthController.revokeApiToken(user.id, tokenId);
    console.log("Deleting API token successfully completed");
    return {
        success: true,
        message: "Token revoked successfully",
        status: 200
    };
  } catch (error: any) {
    console.log("Error in listing API tokens task: ", error);
    return {
        success: false,
        error: error.message || "Internal Server Error",
        status: error.status || 500
    };
  }
});

console.log("Auth worker is running...");
console.log("URL worker is running...");
