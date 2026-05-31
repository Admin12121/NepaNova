import { useSession, signOut } from "next-auth/react";

export const useAuthUser = () => {
  const session = useSession();
  const permissions = session.data?.permissions || [];
  const roles = session.data?.roles || [];

  const Update = async () => {
    await session.update();
  };

  return {
    user: session.data?.user,
    accessToken: session.data?.accessToken,
    role: session.data?.role,
    roles,
    permissions,
    hasPermission: (permission: string) => permissions.includes(permission),
    status: session.status === "authenticated" && !!session.data?.accessToken,
    signOut: signOut,
    update: Update,
  };
};
