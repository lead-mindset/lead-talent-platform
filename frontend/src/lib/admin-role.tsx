"use client";

import { createContext, useContext } from "react";

export type AdminRole = "global" | "country" | "chapter";

export type AdminContextValue = {
  role: AdminRole;
  scope: string;
};

export const AdminRoleContext = createContext<AdminContextValue>({ role: "chapter", scope: "" });

export function useAdminRole() {
  return useContext(AdminRoleContext);
}