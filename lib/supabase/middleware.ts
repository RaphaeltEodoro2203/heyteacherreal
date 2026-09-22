import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/student") ||
    path.startsWith("/teacher") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/pending") ||
    path.startsWith("/placement-test") ||
    path.startsWith("/notifications");
  const isAuthPage = path.startsWith("/login");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
    return NextResponse.redirect(url);
  }

  // Role fence: students can't open /teacher/*, teachers can't open /student/*
  if (user && (path.startsWith("/student") || path.startsWith("/teacher"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status, onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile?.role === "teacher" && path.startsWith("/student")) {
      const url = request.nextUrl.clone();
      url.pathname = "/teacher/dashboard";
      return NextResponse.redirect(url);
    }
    if (profile?.role === "student" && path.startsWith("/teacher")) {
      const url = request.nextUrl.clone();
      url.pathname = "/student/dashboard";
      return NextResponse.redirect(url);
    }

    if (profile?.role === "student") {
      // Aluno ainda não aprovado pela professora: bloqueia todas as telas de aluno
      if (profile.status !== "approved" && path.startsWith("/student")) {
        const url = request.nextUrl.clone();
        url.pathname = "/pending";
        return NextResponse.redirect(url);
      }
      // Aprovado mas ainda não fez o onboarding
      if (profile.status === "approved" && !profile.onboarding_completed && path.startsWith("/student")) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
      // Onboarding feito mas ainda não fez o placement test
      if (profile.status === "approved" && profile.onboarding_completed && path.startsWith("/student")) {
        const { data: placement } = await supabase
          .from("placement_tests")
          .select("id")
          .eq("student_id", user.id)
          .maybeSingle();
        if (!placement) {
          const url = request.nextUrl.clone();
          url.pathname = "/placement-test";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  // Se já está aprovado/completo e tenta abrir /pending, /onboarding ou /placement-test, manda pro dashboard
  if (user && (path.startsWith("/pending") || path.startsWith("/onboarding") || path.startsWith("/placement-test"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status, onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile?.role === "teacher") {
      const url = request.nextUrl.clone();
      url.pathname = "/teacher/dashboard";
      return NextResponse.redirect(url);
    }

    if (profile?.status === "approved") {
      if (path.startsWith("/pending")) {
        const url = request.nextUrl.clone();
        url.pathname = profile.onboarding_completed ? "/student/dashboard" : "/onboarding";
        return NextResponse.redirect(url);
      }
      if (path.startsWith("/onboarding") && profile.onboarding_completed) {
        const url = request.nextUrl.clone();
        url.pathname = "/student/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
