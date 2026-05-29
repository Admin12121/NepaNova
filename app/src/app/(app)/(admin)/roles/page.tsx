"use client";

import React, { useMemo, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
  useUpdateRoleMutation,
} from "@/lib/store/Service/api";

type Permission = {
  id: number;
  code: string;
  name: string;
  description?: string;
};

type Role = {
  id: number;
  name: string;
  slug: string;
  color: string;
  position: number;
  is_default: boolean;
  is_system: boolean;
  permissions: number[];
  permission_codes: string[];
  user_count: number;
};

const defaultColor = "#4A7C2F";

const RolesPage = () => {
  const { accessToken } = useAuthUser();
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery(
    { token: accessToken },
    { skip: !accessToken },
  );
  const { data: permissionsData, isLoading: permissionsLoading } =
    useGetPermissionsQuery({ token: accessToken }, { skip: !accessToken });
  const [createRole, { isLoading: creating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: deleting }] = useDeleteRoleMutation();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(
    new Set(),
  );

  const roles = useMemo<Role[]>(
    () => rolesData?.results || rolesData || [],
    [rolesData],
  );
  const permissions = useMemo<Permission[]>(
    () => permissionsData?.results || permissionsData || [],
    [permissionsData],
  );
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const resetForm = () => {
    setSelectedRoleId(null);
    setName("");
    setColor(defaultColor);
    setSelectedPermissions(new Set());
  };

  const editRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setName(role.name);
    setColor(role.color || defaultColor);
    setSelectedPermissions(new Set(role.permissions || []));
  };

  const togglePermission = (permissionId: number, checked: boolean) => {
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(permissionId);
      } else {
        next.delete(permissionId);
      }
      return next;
    });
  };

  const saveRole = async () => {
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }

    const actualData = {
      name: name.trim(),
      color,
      permissions: Array.from(selectedPermissions),
    };

    try {
      if (selectedRoleId) {
        await updateRole({ id: selectedRoleId, actualData, token: accessToken }).unwrap();
        toast.success("Role updated");
      } else {
        await createRole({ actualData, token: accessToken }).unwrap();
        toast.success("Role created");
      }
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to save role");
    }
  };

  const removeRole = async (role: Role) => {
    if (role.is_system) {
      toast.error("System roles cannot be deleted");
      return;
    }
    try {
      await deleteRole({ id: role.id, token: accessToken }).unwrap();
      if (selectedRoleId === role.id) resetForm();
      toast.success("Role deleted");
    } catch (error: any) {
      toast.error(error?.data?.error || "Failed to delete role");
    }
  };

  const loading = rolesLoading || permissionsLoading;

  return (
    <section className="h-[90dvh] overflow-y-auto p-3 lg:px-6">
      <div className="mx-auto flex w-full max-w-[95rem] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Roles & permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage admin access using backend RBAC permissions.
          </p>
        </div>

        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Spinner color="default" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Card className="rounded-lg bg-white shadow-none dark:bg-neutral-900">
              <CardHeader className="space-y-1">
                <h2 className="text-base font-semibold">
                  {selectedRole ? "Edit role" : "Create role"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Assign permission codes to control admin capabilities.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Role name</Label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Operations"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    <Input
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      placeholder="#4A7C2F"
                    />
                    <span
                      className="h-9 w-10 rounded-md border"
                      style={{ backgroundColor: color || defaultColor }}
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="grid gap-2">
                    {permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                      >
                        <Checkbox
                          checked={selectedPermissions.has(permission.id)}
                          onCheckedChange={(checked) =>
                            togglePermission(permission.id, Boolean(checked))
                          }
                        />
                        <span className="grid gap-0.5">
                          <span className="text-sm font-medium">
                            {permission.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {permission.code}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="custom"
                    onClick={saveRole}
                    loading={creating || updating}
                  >
                    {selectedRole ? "Save role" : "Create role"}
                  </Button>
                  {selectedRole && (
                    <Button variant="outline" onClick={resetForm}>
                      New role
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid content-start gap-3">
              {roles.map((role) => (
                <Card
                  key={role.id}
                  className="rounded-lg bg-white shadow-none dark:bg-neutral-900"
                >
                  <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: role.color || defaultColor }}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{role.name}</h2>
                          <Badge variant="secondary">{role.slug}</Badge>
                          {role.is_system && <Badge>System</Badge>}
                          <Badge variant="outline">{role.user_count} users</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(role.permission_codes || []).map((code) => (
                            <Badge key={code} variant="outline">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => editRole(role)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={role.is_system || deleting}
                        onClick={() => removeRole(role)}
                        aria-label={`Delete ${role.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default RolesPage;
