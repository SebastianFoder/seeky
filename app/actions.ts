"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, checkUsername } from "./accountChecks";

export const signUpAction = async (formData: FormData) => {
  const supabase = await createClient();
  const username = formData.get("username")?.toString()?.trim();
  const password = formData.get("password")?.toString()?.trim();
  const origin = (await headers()).get("origin");

  // Basic Validation
  if (!username || !password) {
    return encodedRedirect("error", "/sign-up", "Username and password are required");
  }

  const usernameCheck = checkUsername(username);
  if (!usernameCheck.success) {
    return encodedRedirect("error", "/sign-up", usernameCheck.message);
  }

  const passwordCheck = checkPassword(password);
  if (!passwordCheck.success) {
    return encodedRedirect("error", "/sign-up", passwordCheck.message);
  }

  // Sign Up with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email: `${username}@example.com`, // Placeholder email
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        display_name: username,
      },
    },
  });

  if (error) {
    console.error(`${error.code} ${error.message}`);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    // Ensure the user object is available
    const userId = data?.user?.id;
    if (userId) {
      // Insert the new user into the accounts table
      const { error: insertError } = await supabase
        .from("accounts")
        .insert([
          {
            uid: userId, // Primary key referencing auth.users.id
            username: username,
            // Optional fields can be omitted or set to null
            email: `${username}@example.com`, // Placeholder or can be updated later
            display_name: username, // Default to username; can be updated later
            avatar_url: null,
            bio: null,
            role: "user", // Default role
            status: "active", // Default status
          },
        ]);

      if (insertError) {
        console.error("Error inserting into accounts table:", insertError.message);
        // Optionally, delete the newly created auth user to maintain consistency
        await supabase.auth.admin.deleteUser(userId);
        return encodedRedirect("error", "/sign-up", "Account creation failed. Please try again.");
      }
    } else {
      console.error("User ID not found after sign-up.");
      return encodedRedirect("error", "/sign-up", "Unexpected error. Please try again.");
    }

    return redirect("/protected");
  }
};

export const signInAction = async (formData: FormData) => {
  const supabase = await createClient();
  const username = formData.get("username")?.toString();
  const password = formData.get("password") as string;

  if(!username || !password){
    return encodedRedirect("error", "/sign-in", "Username and password fields must be filled");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: `${username.trim()}@example.com`,
    password: password.trim(),
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};
export const forgotPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();
  const email = formData.get("email")?.toString();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  if(!email.includes("@")){
    return encodedRedirect("error", "/forgot-password", "Email must be a valid email address");
  }

  if(email.includes("@example.com")){
    return encodedRedirect("error", "/forgot-password", "Email must not be an example email address");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  let password = formData.get("password") as string;
  let confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  password = password.trim();
  confirmPassword = confirmPassword.trim();

  if(password.length < 6){
    return encodedRedirect("error", "/protected/reset-password", "Password must be at least 6 characters long");
  }

  if(password.includes(" ")){
    return encodedRedirect("error", "/protected/reset-password", "Password cannot contain spaces");
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

