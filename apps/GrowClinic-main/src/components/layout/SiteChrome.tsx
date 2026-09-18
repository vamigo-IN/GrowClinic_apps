import React from "react";
import { PathnameShell } from "./PathnameShell";

export function SiteChrome({ children }: { children: React.ReactNode }) {
    return <PathnameShell>{children}</PathnameShell>;
}
