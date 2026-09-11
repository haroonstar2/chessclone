import React, { useEffect, useState } from "react";

// Save the email in local storage so that it can be pre-filled on the login page
const AUTH_EMAIL_STORAGE_KEY = "auth-email";

export default function LoginForm({
  handleSubmit,
  isLoading,
  title,
  buttonLabel,
  footer,
}: {
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    email: string,
    password: string,
  ) => void;
  isLoading: boolean;
  title: string;
  buttonLabel: string;
  footer: React.ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Pre-fill the email field with the saved email from local storage
  useEffect(() => {
    const savedEmail = window.localStorage.getItem(AUTH_EMAIL_STORAGE_KEY);

    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  // Update the email state and save it to local storage whenever it changes
  const handleEmailChange = (value: string) => {
    setEmail(value);
    window.localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-6 text-center">{title}</h1>
        <form
          onSubmit={(e) => handleSubmit(e, email, password)}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              onChange={(e) => handleEmailChange(e.target.value)}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {isLoading ? "Loading..." : buttonLabel}
          </button>
        </form>
        {footer}
      </div>
    </div>
  );
}
