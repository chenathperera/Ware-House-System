"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Lock, Save, User } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import api from "../../../client/api/axios.js";
import { useAuthStore } from "../../../client/store/authStore.js";
import { useUpdateUser } from "../../../client/features/users/useUsers.js";
import { getRoleConfig } from "../../../client/features/users/roleConfig.js";
export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [change, setChange] = useState(false);
  const update = useUpdateUser();
  const profile = useForm({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
    },
  });
  const password = useForm();
  const save = async (data) => {
    try {
      const result = await update.mutateAsync({
        id: user._id,
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          role: user.role,
          isActive: true,
        },
      });
      setUser({ ...user, ...result.data });
    } catch {}
  };
  const changePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) return toast.error("New passwords do not match");
    if (data.newPassword.length < 6)
      return toast.error("New password must be at least 6 characters");
    try {
      await api.post("/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password changed successfully");
      password.reset();
      setChange(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    }
  };
  const role = getRoleConfig(user?.role);
  return (
    <>
      <PageHeader title="My Profile" description="Update your personal information and security" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <User size={20} className="text-gray-600" />
              <h3 className="text-sm font-semibold">Personal Information</h3>
            </div>
            <form onSubmit={profile.handleSubmit(save)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  required
                  {...profile.register("firstName", { required: true })}
                />
                <Input
                  label="Last Name"
                  required
                  {...profile.register("lastName", { required: true })}
                />
              </div>
              <Input label="Email (read-only)" value={user?.email || ""} disabled />
              <Input label="Phone" type="tel" {...profile.register("phone")} />
              <div className="border-t pt-4">
                <Button type="submit" loading={update.isPending}>
                  <Save size={14} className="mr-1.5" />
                  Save Profile
                </Button>
              </div>
            </form>
          </Card>
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock size={20} className="text-gray-600" />
                <h3 className="text-sm font-semibold">Password &amp; Security</h3>
              </div>
              {!change && (
                <Button variant="outline" size="sm" onClick={() => setChange(true)}>
                  Change Password
                </Button>
              )}
            </div>
            {change ? (
              <form onSubmit={password.handleSubmit(changePassword)} className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  required
                  {...password.register("currentPassword", { required: true })}
                />
                <Input
                  label="New Password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  {...password.register("newPassword", { required: true, minLength: 6 })}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  required
                  {...password.register("confirmPassword", { required: true })}
                />
                <div className="flex gap-2 border-t pt-4">
                  <Button type="submit">Update Password</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      password.reset();
                      setChange(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-gray-500">
                Your password is encrypted. Change it regularly for security.
              </p>
            )}
          </Card>
        </div>
        <Card className="h-fit p-6 lg:sticky lg:top-6">
          <h3 className="mb-4 text-sm font-semibold">Account Details</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <span
                className="mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: role.color }}
              >
                {role.label}
              </span>
              <p className="mt-2 text-xs text-gray-600">{role.description}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Account Status</p>
              <Badge variant="success">Active</Badge>
            </div>
            {user?.lastLoginAt && (
              <div>
                <p className="text-xs text-gray-500">Last Login</p>
                <p>{new Date(user.lastLoginAt).toLocaleString("en-LK")}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
