"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
  useUpdateRoleMutation,
} from "@/lib/store/Service/api";
import { cn } from "@/lib/utils";

type Permission = {
  id: number;
  code: string;
  name: string;
  description?: string;
};

type RoleMember = {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  state?: string;
  roles?: string[];
};

type Role = {
  id: number;
  name: string;
  slug: string;
  color: string;
  position: number;
  is_default: boolean;
  is_system: boolean;
  is_mutable: boolean;
  permissions: number[];
  permission_codes: string[];
  user_count: number;
  members?: RoleMember[];
};

const defaultColor = "#4A7C2F";
const tablePageSize = 10;

const isHexColor = (value?: string | null) =>
  Boolean(value && /^#[0-9a-f]{6}$/i.test(value.trim()));

const getDisplayColor = (value?: string | null) =>
  isHexColor(value) ? value!.trim() : defaultColor;

const formatPermissionGroup = (value: string) =>
  value
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getPermissionGroup = (permission: Permission) =>
  permission.code.split(".")[0] || "general";

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
  const [viewMode, setViewMode] = useState<"table" | "editor">("table");
  const [activeTab, setActiveTab] = useState("display");
  const [roleSearch, setRoleSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const roles = useMemo<Role[]>(
    () => rolesData?.results || rolesData || [],
    [rolesData],
  );
  const permissions = useMemo<Permission[]>(
    () => permissionsData?.results || permissionsData || [],
    [permissionsData],
  );
  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const selectedRoleReadOnly = selectedRole ? !selectedRole.is_mutable : false;

  const visibleRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();

    if (!query) return roles;

    return roles.filter((role) =>
      [
        role.name,
        role.slug,
        String(role.position),
        role.is_system ? "system" : "custom",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [roleSearch, roles]);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleRoles.length / tablePageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRoles = visibleRoles.slice(
    (safeCurrentPage - 1) * tablePageSize,
    safeCurrentPage * tablePageSize,
  );
  const showingFrom =
    visibleRoles.length === 0 ? 0 : (safeCurrentPage - 1) * tablePageSize + 1;
  const showingTo = Math.min(
    safeCurrentPage * tablePageSize,
    visibleRoles.length,
  );

  const visiblePermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();

    if (!query) return permissions;

    return permissions.filter((permission) =>
      [permission.name, permission.code, permission.description || ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [permissionSearch, permissions]);

  const permissionGroups = useMemo(
    () =>
      visiblePermissions.reduce<Record<string, Permission[]>>(
        (groups, permission) => {
          const group = getPermissionGroup(permission);
          groups[group] ??= [];
          groups[group].push(permission);
          return groups;
        },
        {},
      ),
    [visiblePermissions],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [roleSearch]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const resetForm = () => {
    setSelectedRoleId(null);
    setName("");
    setColor(defaultColor);
    setSelectedPermissions(new Set());
    setPermissionSearch("");
    setActiveTab("display");
    setViewMode("table");
  };

  const openCreateRole = () => {
    setSelectedRoleId(null);
    setName("New role");
    setColor(defaultColor);
    setSelectedPermissions(new Set());
    setPermissionSearch("");
    setActiveTab("display");
    setViewMode("editor");
  };

  const editRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setName(role.name);
    setColor(getDisplayColor(role.color));
    setSelectedPermissions(new Set(role.permissions || []));
    setPermissionSearch("");
    setActiveTab("display");
    setViewMode("editor");
  };

  const togglePermission = (permissionId: number, checked: boolean) => {
    if (selectedRoleReadOnly) {
      return;
    }
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
    if (selectedRoleReadOnly) {
      toast.error("System and default roles are read-only");
      return;
    }

    const actualData = {
      name: name.trim(),
      color: getDisplayColor(color),
      permissions: Array.from(selectedPermissions),
    };

    try {
      if (selectedRoleId) {
        await updateRole({
          id: selectedRoleId,
          actualData,
          token: accessToken,
        }).unwrap();
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
    if (!role.is_mutable) {
      toast.error("System and default roles cannot be deleted");
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

  const renderRoleDot = (roleColor: string) => (
    <span
      aria-hidden="true"
      className="h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: getDisplayColor(roleColor) }}
    />
  );

  const loading = rolesLoading || permissionsLoading;
  const saving = creating || updating;
  const editorTitle = selectedRole ? selectedRole.name : name || "New role";
  const editorColor = selectedRole
    ? getDisplayColor(selectedRole.color)
    : color;
  const editorMemberCount = selectedRole?.user_count || 0;
  const editorMembers = selectedRole?.members || [];

  if (loading) {
    return (
      <section className="h-[90dvh]">
        <div className="flex h-full items-center justify-center">
          <Spinner color="default" />
        </div>
      </section>
    );
  }

  if (viewMode === "editor") {
    return (
      <div className="mx-auto flex h-full w-full max-w-[95rem] overflow-hidden text-foreground">
        <aside className="flex w-72 shrink-0 flex-col border-r bg-muted/30 dark:bg-neutral-900/30">
          <div className="flex h-14 items-center justify-between border-b px-3">
            <Button
              aria-label="Back to roles"
              variant="ghost"
              size="icon"
              onClick={resetForm}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Create role"
              variant="outline"
              size="icon"
              onClick={openCreateRole}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto p-3"
          >
            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
              Roles
            </div>
            <div className="grid gap-1">
              {!selectedRole && (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg bg-muted px-3 py-2 text-left text-sm font-medium"
                >
                  {renderRoleDot(color)}
                  <span className="min-w-0 flex-1 truncate">
                    {name || "New role"}
                  </span>
                </button>
              )}
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => editRole(role)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    selectedRoleId === role.id && "bg-muted font-medium",
                  )}
                >
                  {renderRoleDot(role.color)}
                  <span className="min-w-0 flex-1 truncate">{role.name}</span>
                  {!role.is_mutable && (
                    <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <div className="flex min-w-0 items-center gap-3">
              {renderRoleDot(editorColor)}
              <h1 className="truncate text-base font-semibold">
                {selectedRole ? editorTitle : "Create role"}
              </h1>
              {selectedRole?.is_system && (
                <Badge variant="warning">System</Badge>
              )}
              {selectedRole?.is_default && (
                <Badge variant="success">Default</Badge>
              )}
            </div>
            <Button
              aria-label="Save role"
              variant="custom"
              size="icon"
              loading={saving}
              disabled={!name.trim() || selectedRoleReadOnly}
              onClick={saveRole}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col p-3"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="display">Display</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="members">
                Members ({editorMemberCount})
              </TabsTrigger>
            </TabsList>

            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="display" className="mt-0">
                <div className="grid gap-6 p-4">
                  {selectedRoleReadOnly && (
                    <div className="flex gap-3 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        System and default roles are read-only. Create a custom
                        role to change permissions.
                      </span>
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="role-name">Name</Label>
                      <Input
                        id="role-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Operations"
                        disabled={selectedRoleReadOnly}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role-color">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="role-color"
                          type="color"
                          value={getDisplayColor(color)}
                          onChange={(event) => setColor(event.target.value)}
                          className="h-9 w-12 shrink-0 cursor-pointer p-1"
                          aria-label="Pick role color"
                          disabled={selectedRoleReadOnly}
                        />
                        <Input
                          value={color}
                          onChange={(event) => setColor(event.target.value)}
                          placeholder={defaultColor}
                          className="font-mono text-xs"
                          disabled={selectedRoleReadOnly}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="mt-0">
                <div className="grid gap-5 p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={permissionSearch}
                      onChange={(event) =>
                        setPermissionSearch(event.target.value)
                      }
                      placeholder="Search permissions"
                      className="pl-9"
                      type="search"
                    />
                  </div>

                  <div className="grid gap-6">
                    {Object.entries(permissionGroups).length > 0 ? (
                      Object.entries(permissionGroups).map(([group, items]) => (
                        <section key={group} className="grid gap-3">
                          <h2 className="text-base font-semibold">
                            {formatPermissionGroup(group)}
                          </h2>
                          <div className="divide-y rounded-lg border border-transparent px-2">
                            {items.map((permission) => {
                              const checked = selectedPermissions.has(
                                permission.id,
                              );

                              return (
                                <div
                                  key={permission.id}
                                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold">
                                      {permission.code}
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {permission.description ||
                                        permission.name}
                                    </p>
                                  </div>
                                  <Switch
                                    checked={checked}
                                    disabled={selectedRoleReadOnly}
                                    onCheckedChange={(value) =>
                                      togglePermission(
                                        permission.id,
                                        Boolean(value),
                                      )
                                    }
                                    aria-label={`Toggle ${permission.code}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No permissions found.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="members" className="mt-0">
                <div className="grid gap-4 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">
                      Members - {editorMemberCount}
                    </h2>
                    <Button
                      aria-label="Add member"
                      variant="outline"
                      size="icon"
                      disabled
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-lg bg-white dark:bg-neutral-900">
                    <div className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Current roles</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editorMembers.length > 0 ? (
                            editorMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell className="font-medium">
                                  {member.name ||
                                    `${member.first_name || ""} ${
                                      member.last_name || ""
                                    }`.trim() ||
                                    member.username ||
                                    member.email}
                                </TableCell>
                                <TableCell>{member.email}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {(member.roles || []).map((roleSlug) => (
                                      <Badge key={roleSlug} variant="outline">
                                        {roleSlug}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      member.state === "blocked"
                                        ? "danger"
                                        : "success"
                                    }
                                  >
                                    {member.state || "active"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="h-24 text-center text-sm text-muted-foreground"
                              >
                                No members assigned.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[95rem] flex-col overflow-hidden text-foreground">
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={roleSearch}
              onChange={(event) => setRoleSearch(event.target.value)}
              placeholder="Search roles"
              className="pl-9"
              type="search"
            />
          </div>
          <Button variant="outline" onClick={openCreateRole}>
            <Plus className="mr-2 h-4 w-4" />
            Create role
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg bg-white dark:bg-neutral-900">
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead>
                    Application Roles - {visibleRoles.length}
                  </TableHead>
                  <TableHead className="w-32">Members</TableHead>
                  <TableHead className="w-32 text-right">Position</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRoles.length > 0 ? (
                  paginatedRoles.map((role) => (
                    <TableRow
                      key={role.id}
                      className="cursor-pointer"
                      onClick={() => editRole(role)}
                    >
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground/60" />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          {renderRoleDot(role.color)}
                          <span className="truncate font-semibold">
                            {role.name}
                          </span>
                          {!role.is_mutable && (
                            <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {role.is_default && (
                            <Badge variant="success">Default</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">
                            {role.user_count}
                          </span>
                          <UsersRound className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {role.position}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label={`Edit ${role.name}`}
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              editRole(role);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label={`Delete ${role.name}`}
                            variant="destructive"
                            size="icon"
                            disabled={!role.is_mutable || deleting}
                            onClick={(event) => {
                              event.stopPropagation();
                              void removeRole(role);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label={`More actions for ${role.name}`}
                            variant="ghost"
                            size="icon"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      No roles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {showingFrom}-{showingTo} of {visibleRoles.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              aria-label="First page"
              variant="ghost"
              size="icon"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Previous page"
              variant="ghost"
              size="icon"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled>
              {safeCurrentPage}
            </Button>
            <Button
              aria-label="Next page"
              variant="ghost"
              size="icon"
              disabled={safeCurrentPage >= totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Last page"
              variant="ghost"
              size="icon"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
