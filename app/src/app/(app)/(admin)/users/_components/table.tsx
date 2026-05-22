import React, { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";

import {
  useDeleteUserMutation,
  useUpdateUserStateMutation,
} from "@/lib/store/Service/api";

import {
  DropdownMenu as DropdownMenuNext,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

import {
  LoaderCircle,
  Search,
  ArrowRight,
  ChevronDown,
  RotateCcw as IoReload,
  CircleAlertIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { User } from "./user";

import { labels } from "./data";

import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge as Chip } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { PlusCircledIcon } from "@radix-ui/react-icons";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const statusOptions = [
  { name: "Published", uid: "i_published" },
  { name: "Draft", uid: "draft" },
];

interface Users {
  id: number;
  password: string;
  email: string;
  profile: string | null;
  first_name: string;
  last_name: string;
  username: string;
  phone: string;
  provider: string | null;
  dob: string | null;
  gender: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface ApiResponse {
  links: {
    next: string | null;
    previous: string | null;
  };
  count: number;
  page_size: number;
  results: Users[];
}

type SortDirection = "ascending" | "descending" | null;

interface SortDescriptor {
  column: string;
  direction: SortDirection;
}

const columns = [
  { name: "ID", uid: "id", sortable: true },
  { name: "USER", uid: "email", sortable: true },
  { name: "ROLE", uid: "role", sortable: true },
  { name: "SOCIAL", uid: "provider", sortable: true },
  { name: "GENDER", uid: "gender", sortable: true },
  { name: "STATE", uid: "state", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = [
  "email",
  "phone",
  "role",
  "provider",
  "state",
  "actions",
];

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function UserTable({
  SetExcludeBy,
  data,
  setSearch,
  isLoading,
  searchLoading,
  dataperpage,
  refetch,
  page,
  setPage,
  exclude_by,
  accessToken,
}: {
  exclude_by: string;
  SetExcludeBy: any;
  isLoading: boolean;
  searchLoading: boolean;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  refetch: () => void;
  data: ApiResponse;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  dataperpage: React.Dispatch<React.SetStateAction<number | null>>;
  accessToken: string;
}) {
  const router = useRouter();
  const [filterValue, setFilterValue] = React.useState("");
  const [searchValue, setsearchValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Set<number>>(
    new Set([]),
  );
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    new Set(INITIAL_VISIBLE_COLUMNS),
  );
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "id",
    direction: "ascending",
  });
  const [users, setUsers] = React.useState<Users[]>([]);
  const [totalUsers, setTotalUsers] = React.useState<number>(0);
  const pages = Math.ceil(totalUsers / rowsPerPage);
  const [DeleteModalId, setDeleteModalId] = React.useState<number | null>(null);
  const [deleteModalUsername, setDeleteModalUsername] =
    React.useState<string>("");
  const [updateUserState] = useUpdateUserStateMutation();

  const handleStateChange = async (userId: number, newState: string) => {
    try {
      const res = await updateUserState({
        userId,
        state: newState,
        token: accessToken,
      }).unwrap();
      toast.success(res.message || `User state updated to ${newState}`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to update user state");
    }
  };

  const handleColumnToggle = (columnUid: string) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnUid)) {
        newSet.delete(columnUid);
      } else {
        newSet.add(columnUid);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(users.map((u) => u.id)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSort = (column: string) => {
    setSortDescriptor((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction:
            prev.direction === "ascending" ? "descending" : "ascending",
        };
      }
      return { column, direction: "ascending" };
    });
  };

  useEffect(() => {
    if (data) {
      setUsers(data.results);
      setTotalUsers(data.count);
    }
  }, [data, page, exclude_by]);

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    return columns.filter((column) => visibleColumns.has(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    const filteredUsers = [...users];
    if (statusFilter !== "all") {
      const excludedStatuses = statusOptions
        .map((option) => option.uid)
        .filter((status) => status !== statusFilter);

      SetExcludeBy(excludedStatuses);
    }

    return filteredUsers;
  }, [users, page, statusFilter, SetExcludeBy]);

  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a: Users, b: Users) => {
      const first = a[sortDescriptor.column as keyof Users] as number;
      const second = b[sortDescriptor.column as keyof Users] as number;
      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, users, page, statusFilter, exclude_by, filteredItems]);

  const renderCell = React.useCallback(
    (users: Users, columnKey: React.Key) => {
      const cellValue = users[columnKey as keyof Users];

      switch (columnKey) {
        case "email":
          return (
            <User
              avatarProps={{
                src: users?.profile as string,
                name: `${users.username.slice(0, 1)}`,
                classNames: {
                  base: "bg-gradient-to-br from-[#FFB457] to-[#FF705B] cursor-pointer",
                  icon: "text-black/80",
                },
              }}
              classNames={{
                description: "text-default-500",
                name: "cursor-pointer",
              }}
              description={users.email}
              name={`${users.username}`}
            />
          );
        case "phone":
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small capitalize">{users.phone}</p>
            </div>
          );
        case "gender":
          return (
            <div className="flex flex-col">
              <p className="text-bold text-small capitalize">
                {users.gender || ""}
              </p>
            </div>
          );
        case "state":
          return (
            <Chip
              className={`capitalize border-none gap-1 ${
                users.state === "blocked"
                  ? "text-red-500 bg-red-50 dark:bg-red-950/30"
                  : "text-green-600 bg-green-50 dark:bg-green-950/30"
              }`}
              variant="secondary"
            >
              {users.state}
            </Chip>
          );
        case "provider":
          return <p>{users.provider || "default"}</p>;
        case "actions":
          return (
            <div className="relative flex items-center justify-center gap-2">
              <DropdownMenuNext>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                  >
                    <DotsHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push(`/users/${users.username}`)}
                  >
                    View
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>State</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={users.state}
                        onValueChange={(value) =>
                          handleStateChange(users.id, value)
                        }
                      >
                        {labels.map((label) => (
                          <DropdownMenuRadioItem
                            key={label.value}
                            value={label.value}
                          >
                            {label.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setDeleteModalId(users.id);
                      setDeleteModalUsername(users.username);
                    }}
                  >
                    Delete
                    <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuNext>
            </div>
          );
        default:
          return cellValue;
      }
    },
    [router],
  );

  const onRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dataperpage(Number(e.target.value));
    setRowsPerPage(Number(e.target.value));
    setPage(1);
  };

  const onSearchChange = (value?: string) => {
    if (value) {
      setsearchValue(value);
      setSearch(value);
      setPage(1);
    } else {
      setFilterValue("");
      setsearchValue("");
      setSearch("");
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (pages <= maxVisiblePages) {
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("ellipsis");
        pageNumbers.push(pages);
      } else if (page >= pages - 2) {
        pageNumbers.push(1);
        pageNumbers.push("ellipsis");
        for (let i = pages - 3; i <= pages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push("ellipsis");
        for (let i = page - 1; i <= page + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("ellipsis");
        pageNumbers.push(pages);
      }
    }

    return pageNumbers;
  };

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <div className="relative">
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(event) => {
                onSearchChange(event.target.value);
              }}
              className="h-8 w-[150px] lg:w-[350px] peer pe-9 ps-9  "
            />
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
              {searchLoading ? (
                <LoaderCircle
                  className="animate-spin"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  role="presentation"
                />
              ) : (
                <Search size={16} strokeWidth={2} aria-hidden="true" />
              )}
            </div>
            <button
              className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 ring-offset-background transition-shadow hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Press to speak"
              type="submit"
            >
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className="flex gap-3">
            <DropdownMenuNext>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="flex h-8 gap-2 w-20 p-0 data-[state=open]:bg-muted"
                >
                  Status <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                {statusOptions.map((status) => (
                  <DropdownMenuItem key={status.uid} className="cursor-pointer">
                    {capitalize(status.name)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenuNext>
            <DropdownMenuNext>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="flex h-8 gap-2 w-24 p-0 data-[state=open]:bg-muted"
                >
                  Columns <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.uid}
                    className="cursor-pointer"
                    checked={visibleColumns.has(column.uid)}
                    onCheckedChange={() => handleColumnToggle(column.uid)}
                  >
                    {capitalize(column.name)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenuNext>
            <Button
              size="sm"
              variant="secondary"
              color="default"
              onClick={() => {
                refetch();
              }}
            >
              <IoReload className="h-4 w-4 text-small" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">
            Total {totalUsers} users
          </span>
          <label className="flex items-center text-default-400 text-small">
            Rows per page:
            <select
              className="bg-transparent outline-none text-default-400 text-small cursor-pointer"
              onChange={onRowsPerPageChange}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>
      </div>
    );
  }, [
    filterValue,
    statusFilter,
    visibleColumns,
    onSearchChange,
    onRowsPerPageChange,
    users.length,
    hasSearchFilter,
    searchValue,
    searchLoading,
    totalUsers,
    router,
    refetch,
  ]);

  const bottomContent = React.useMemo(() => {
    const pageNumbers = getPageNumbers();

    return (
      <div className="py-2 px-2 flex justify-between items-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1 && !hasSearchFilter) setPage(page - 1);
                }}
                className={cn(
                  page <= 1 || hasSearchFilter
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer",
                )}
              />
            </PaginationItem>

            {pageNumbers.map((pageNum, index) =>
              pageNum === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    isActive={page === pageNum}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!hasSearchFilter) setPage(pageNum);
                    }}
                    className={cn(
                      hasSearchFilter
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer",
                    )}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < pages && !hasSearchFilter) setPage(page + 1);
                }}
                className={cn(
                  page >= pages || hasSearchFilter
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer",
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="text-small text-default-400">
          {selectedKeys.size === users.length && users.length > 0
            ? "All items selected"
            : `${selectedKeys.size} of ${filteredItems.length} selected`}
        </span>
      </div>
    );
  }, [
    selectedKeys,
    filteredItems.length,
    page,
    pages,
    hasSearchFilter,
    setPage,
    users.length,
  ]);

  return (
    <>
      <div className="space-y-4">
        {topContent}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      users.length > 0 && selectedKeys.size === users.length
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                  />
                </TableHead>
                {headerColumns.map((column) => (
                  <TableHead
                    key={column.uid}
                    className={cn(
                      column.uid === "actions" ? "text-center" : "text-left",
                      column.sortable ? "cursor-pointer select-none" : "",
                    )}
                    onClick={() => column.sortable && handleSort(column.uid)}
                  >
                    <div className="flex items-center gap-1">
                      {column.name}
                      {column.sortable && (
                        <span className="ml-1">
                          {sortDescriptor.column === column.uid ? (
                            sortDescriptor.direction === "ascending" ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : (
                              <ArrowDown className="h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={headerColumns.length + 1}
                    className="h-[50vh]"
                  >
                    <div className="flex items-center justify-center">
                      <Spinner color="default" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={headerColumns.length + 1}
                    className="h-24 text-center"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    data-state={selectedKeys.has(item.id) ? "selected" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedKeys.has(item.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRow(item.id, checked as boolean)
                        }
                        aria-label={`Select row ${item.id}`}
                        className="translate-y-[2px]"
                      />
                    </TableCell>
                    {headerColumns.map((column) => (
                      <TableCell key={column.uid}>
                        {renderCell(item, column.uid) as React.ReactNode}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {bottomContent}
      </div>

      {DeleteModalId && (
        <DeleteModal
          DeleteModalId={DeleteModalId}
          setDeleteModalId={setDeleteModalId}
          username={deleteModalUsername}
          setDeleteModalUsername={setDeleteModalUsername}
          accessToken={accessToken}
          refetch={refetch}
        />
      )}
    </>
  );
}

const DeleteModal = ({
  DeleteModalId,
  setDeleteModalId,
  username,
  setDeleteModalUsername,
  accessToken,
  refetch,
}: {
  DeleteModalId: number;
  setDeleteModalId: React.Dispatch<React.SetStateAction<number | null>>;
  username: string;
  setDeleteModalUsername: React.Dispatch<React.SetStateAction<string>>;
  accessToken: string;
  refetch: () => void;
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteUser] = useDeleteUserMutation();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteUser({ userId: DeleteModalId, token: accessToken }).unwrap();
      toast.success("User deleted successfully");
      setDeleteModalId(null);
      setDeleteModalUsername("");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setDeleteModalId(null);
    setDeleteModalUsername("");
    setInputValue("");
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={handleClose} />
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            aria-hidden="true"
          >
            <CircleAlertIcon className="text-red-500" size={16} />
          </div>
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h1 className="text-lg font-semibold leading-none tracking-tight sm:text-center">
              Delete user
            </h1>
            <p className="text-sm text-muted-foreground sm:text-center">
              This action cannot be undone. To confirm, please type the username{" "}
              <span className="font-semibold text-foreground">{username}</span>.
            </p>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (inputValue === username) handleDelete();
          }}
        >
          <div className="*:not-first:mt-2">
            <Label>Confirm username</Label>
            <Input
              type="text"
              className="!bg-muted"
              placeholder={`Type ${username} to confirm`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={inputValue !== username || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
