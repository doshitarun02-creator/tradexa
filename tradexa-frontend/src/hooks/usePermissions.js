import { useContext } from "react";
import { PermissionContext } from "../context/PermissionContext";

const usePermissions = () => useContext(PermissionContext);

export default usePermissions;
