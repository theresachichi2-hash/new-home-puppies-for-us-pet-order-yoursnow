import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAIL = "Ovoroc7@gmail.com";
const ADMIN_PASSWORD = "Ovoro123$";

export const Route = createFileRoute("/api/public/ensure-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find existing user by email
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500 });

        let user = list.users.find((u) => (u.email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase());

        if (!user) {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
          });
          if (createErr || !created.user) {
            return new Response(JSON.stringify({ error: createErr?.message ?? "create failed" }), { status: 500 });
          }
          user = created.user;
        } else {
          // Ensure password matches and email is confirmed
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: ADMIN_PASSWORD,
            email_confirm: true,
          });
        }

        // Ensure admin role
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (!roles?.some((r) => r.role === "admin")) {
          await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: "admin" });
        }

        return new Response(JSON.stringify({ ok: true, email: ADMIN_EMAIL }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
