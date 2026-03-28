"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function saveSiteSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const headerScripts = formData.get("headerScripts")?.toString() || "";
  const footerScripts = formData.get("footerScripts")?.toString() || "";

  await prisma.siteSettings.upsert({
    where: { id: "global" },
    update: {
      headerScripts,
      footerScripts,
    },
    create: {
      id: "global",
      headerScripts,
      footerScripts,
    },
  });

  revalidatePath("/", "layout"); // Revalidate all paths to reflect layout changes
  revalidatePath("/admin/settings");
}
