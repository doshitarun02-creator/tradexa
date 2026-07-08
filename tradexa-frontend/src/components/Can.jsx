import usePermissions from "../hooks/usePermissions";

/**
 * Declarative permission gate for JSX.
 *
 * Usage:
 *   <Can perm="markets:settle">
 *     <SettleButton />
 *   </Can>
 *
 *   <Can anyOf={["users:view", "wallet:adjust"]}>
 *     <UsersTab />
 *   </Can>
 *
 * Renders nothing (not even a placeholder) when the permission is missing,
 * so hidden admin actions genuinely do not appear in the DOM for lower roles.
 */
const Can = ({ perm, anyOf, children, fallback = null }) => {
  const { hasPermission, hasAnyPermission, loading } = usePermissions();

  if (loading) return null;

  if (perm && !hasPermission(perm)) return fallback;
  if (anyOf && !hasAnyPermission(anyOf)) return fallback;

  return children;
};

export default Can;
