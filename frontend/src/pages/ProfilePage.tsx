import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ArrowLeft, User, Lock, Trash2, Upload } from "lucide-react";
import {
  getUserProfile,
  updateUserProfile,
  uploadProfileImage,
  changePassword,
  deleteAccount,
} from "../lib/api";
import { storeProfileImage } from "../lib/imageStorage";

interface ProfileData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}

// Simple Card Components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col space-y-1.5 p-6">
    {children}
  </div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-semibold leading-none tracking-tight">
    {children}
  </h2>
);

const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground">
    {children}
  </p>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, logout, updateUser } = useAuth();
  const { addToast } = useToast();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "delete">(
    "profile"
  );
  const [previewImage, setPreviewImage] = useState<string | null>(user?.image || null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch profile on mount
  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      navigate("/signin");
    }
  }, [token, navigate]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      if (!token) return;

      const data = await getUserProfile(token);
      setProfileData(data);
      setPreviewImage(data.image || null);

      // Pre-fill form fields
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
    } catch (err) {
      addToast({
        message: "Failed to load profile",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    try {
      setIsLoading(true);
      
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setPreviewImage(imageData);
        
        // Store image in localStorage with user email as key
        storeProfileImage(user?.email || "", imageData);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const response = await uploadProfileImage(file, token);
      
      // Update local user context with server image
      if (response.user && response.user.image) {
        updateUser({ image: response.user.image });
      }

      setProfileData(response.user);
      addToast({
        message: "Profile picture updated successfully",
        type: "success",
      });
    } catch (err: any) {
      setPreviewImage(user?.image || null); // Revert preview
      addToast({
        message: err.message || "Failed to upload image",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!token) return;

      const response = await updateUserProfile(
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
        },
        token
      );

      // If email was updated, logout user with specific toast
      if (response.email_updated) {
        const updatedEmail = response.email || email;
        const username = user?.username || "User";
        logout();
        navigate("/signin");
        addToast({
          message: `For ${username}, the Email is updated to: ${updatedEmail}. Please log in using that updated email`,
          type: "success",
        });
      } else {
        addToast({
          message: "Profile updated successfully",
          type: "success",
        });
        setProfileData(response.user);
      }
    } catch (err: any) {
      addToast({
        message: err.message || "Failed to update profile",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      addToast({
        message: "Passwords do not match",
        type: "error",
      });
      return;
    }

    if (newPassword.length < 8) {
      addToast({
        message: "Password must be at least 8 characters",
        type: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (!token) return;

      await changePassword(
        {
          old_password: oldPassword,
          new_password: newPassword,
        },
        token
      );

      // Auto logout and show toast
      logout();
      navigate("/signin");
      addToast({
        message: "Password is updated. Please Log in again",
        type: "success",
      });
    } catch (err: any) {
      addToast({
        message: err.message || "Failed to change password",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Delete Account
  const handleDeleteAccount = async () => {
    // Confirm deletion
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and all your data (chats, history) will be permanently deleted."
    );

    if (!confirmed) return;

    setIsLoading(true);

    try {
      if (!token) return;

      await deleteAccount(token);

      // Auto logout and show toast
      logout();
      navigate("/signin");
      addToast({
        message: "Account deleted successfully. All your data has been removed.",
        type: "success",
      });
    } catch (err: any) {
      addToast({
        message: err.message || "Failed to delete account",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !profileData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chat
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-4 font-medium transition-colors border-b-2 -mb-1 ${
              activeTab === "profile"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <User className="inline h-4 w-4 mr-2" />
            Profile Info
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`pb-3 px-4 font-medium transition-colors border-b-2 -mb-1 ${
              activeTab === "password"
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Lock className="inline h-4 w-4 mr-2" />
            Password
          </button>
          <button
            onClick={() => setActiveTab("delete")}
            className={`pb-3 px-4 font-medium transition-colors border-b-2 -mb-1 ${
              activeTab === "delete"
                ? "text-destructive border-destructive"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Trash2 className="inline h-4 w-4 mr-2" />
            Delete
          </button>
        </div>

        {/* Profile Info Tab */}
        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Profile Picture Upload Section */}
              <div className="mb-6 pb-6 border-b border-border">
                <label className="block text-sm font-medium mb-4">Profile Picture</label>
                <div className="flex items-center gap-6">
                  {/* Profile Image Preview */}
                  <div className="flex-shrink-0">
                    {previewImage ? (
                      <img 
                        src={previewImage} 
                        alt="Profile" 
                        className="h-24 w-24 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                        <User className="h-12 w-12 text-primary/50" />
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isLoading}
                      className="hidden"
                      id="profile-image-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("profile-image-input")?.click();
                      }}
                      disabled={isLoading}
                    >
                      <Upload className="h-4 w-4" />
                      {isLoading ? "Uploading..." : "Upload Picture"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPEG, PNG, GIF or WebP. Max 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* Username (Read-only) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <Input
                    type="text"
                    value={user?.username || ""}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Username cannot be changed
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                  </p>
                  
                  {/* Warning */}
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      ⚠️ You will be logged out after changing your Email ID.
                    </p>
                  </div>
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">First Name</label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder=""
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name</label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder=""
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fetchProfile()}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Change Password Tab */}
        {activeTab === "password" && (
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password for security</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Old Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 8 characters
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    minLength={8}
                  />
                </div>

                {/* Warning */}
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    ⚠️ You will be logged out after changing your password.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={isLoading}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Delete Account Tab */}
        {activeTab === "delete" && (
          <Card className="border-destructive/30">
            <CardHeader>
              <h2 className="text-2xl font-semibold leading-none tracking-tight text-destructive">
                Delete Account
              </h2>
              <CardDescription>
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm font-medium text-destructive mb-2">
                  ⚠️ Warning: This action is irreversible
                </p>
                <ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
                  <li>All your chats will be permanently deleted</li>
                  <li>All your search history will be removed</li>
                  <li>You won't be able to access your account anymore</li>
                  <li>You'll need to register again to use ChatPaat</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                If you're having issues with ChatPaat, please{" "}
                <button
                  onClick={() => navigate("/about")}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  contact us
                </button>{" "}
                first before deleting your account.
              </p>

              <Button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                variant="destructive"
                size="lg"
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isLoading ? "Deleting..." : "Delete My Account"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
