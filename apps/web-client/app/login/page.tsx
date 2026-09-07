"use client";

import { useState } from "react";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";

import { login } from "@/lib/api/auth";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = (
    e: React.FormEvent,
    email: string,
    password: string,
  ) => {
    e.preventDefault();
    setIsLoading(true);

    console.log("Email:", email);
    console.log("Password:", password);

    login(email, password)
      .then((response) => {
        console.log("Login successful:", response);
        // Handle successful login, e.g., redirect to dashboard
      })
      .catch((error) => {
        // console.error("Login failed:", error);
        setIsError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold">Welcome Back!</h2>
        <p className="text-gray-600">Please log in to your account.</p>
      </div>
      {isError && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-center">
          Invalid email or password. Please try again.
        </div>
      )}
      <LoginForm
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        title="Log In"
        buttonLabel="Log In"
        footer={
          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </p>
        }
      />
    </>
  );
}
