import { useAuthStore } from "../stores/auth";

export async function openSchool(school) {
  const auth = useAuthStore();
  await auth.switchSchool({ schoolId: school.id });
  window.location.assign("/dashboard");
}

export function officersPath(school, role, singleTenant) {
  const name = encodeURIComponent(school.name || "");
  if (role === "SUPER_ADMIN" && !singleTenant) {
    return `/platform/schools/${school.id}/officers?name=${name}`;
  }
  return `/tenant/schools/${school.id}/officers?name=${name}`;
}
