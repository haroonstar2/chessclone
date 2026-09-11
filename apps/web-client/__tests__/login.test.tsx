import { render, screen, fireEvent } from "@testing-library/react";
import LoginPage from "../app/login/page";

describe("LoginPage", () => {
  it("renders the login form", () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("handles form submission loading state", () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole("button", { name: /log in/i });
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    expect(
      screen.getByRole("button", { name: /loading/i }),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});
