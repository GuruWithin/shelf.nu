import { OrganizationRoles } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, Outlet, useLoaderData } from "@remix-run/react";
import HorizontalTabs from "~/components/layout/horizontal-tabs";
import type { Item } from "~/components/layout/horizontal-tabs/types";
import { makeShelfError } from "~/utils/error";
import { data, error } from "~/utils/http.server";
import {
  PermissionAction,
  PermissionEntity,
} from "~/utils/permissions/permission.validator.server";
import { requirePermission } from "~/utils/roles.server";

export type UserFriendlyRoles = "Administrator" | "Owner" | "Self service";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const authSession = context.getSession();
  const { userId } = authSession;
  try {
    const { currentOrganization } = await requirePermission({
      userId,
      request,
      entity: PermissionEntity.teamMember,
      action: PermissionAction.read,
    });
    return json(
      data({ isPersonalOrg: currentOrganization.type === "PERSONAL" })
    );
  } catch (cause) {
    const reason = makeShelfError(cause);
    throw json(error(reason), { status: reason.status });
  }
};

export const organizationRolesMap: Record<string, UserFriendlyRoles> = {
  [OrganizationRoles.ADMIN]: "Administrator",
  [OrganizationRoles.OWNER]: "Owner",
  [OrganizationRoles.SELF_SERVICE]: "Self service",
};

export default function TeamSettings() {
  const { isPersonalOrg } = useLoaderData<typeof loader>();

  const TABS: Item[] = [
    ...(!isPersonalOrg ? [{ to: "users", content: "Users" }] : []),
    { to: "nrm", content: "Non-registered members" },
  ];

  return (
    <div className="h-full rounded border bg-white p-4 md:px-10 md:py-8">
      <h1 className="text-[18px] font-semibold">Shelf’s team</h1>
      <p className="mb-6 text-sm text-gray-600">
        Manage your existing team and give team members custody to certain
        assets.
      </p>

      <HorizontalTabs items={TABS} />

      <Outlet />
    </div>
  );
}
