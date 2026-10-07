"use client";

import { useLinkStatus } from "next/link";

export function DoctorNavPending() {
  const { pending } = useLinkStatus();
  return <span className="dv-nav-pending" data-pending={pending || undefined} aria-hidden="true" />;
}
